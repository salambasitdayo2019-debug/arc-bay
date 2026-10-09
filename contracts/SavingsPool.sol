// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

/// @title SavingsPool — deposit USDC, earn configurable APY yield
contract SavingsPool is Ownable2Step, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // ─── Custom Errors ────────────────────────────────────────────────────────
    error ZeroAmount();
    error InsufficientPrincipal(uint256 available, uint256 requested);
    error RateTooHigh(uint256 max, uint256 provided);
    error PendingRateNotQueued();
    error RateChangeNotReady(uint256 readyAt);

    // ─── Events ───────────────────────────────────────────────────────────────
    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount, uint256 yieldPaid);
    event YieldPaid(address indexed user, uint256 amount);
    event RateProposed(uint256 newBps, uint256 effectiveAt);
    event RateUpdated(uint256 newBps);
    event YieldReserveFunded(uint256 amount);

    // ─── State ────────────────────────────────────────────────────────────────
    address public immutable usdc;
    uint256 public apyBps;

    // Queued rate change (2-step with 1-day delay)
    uint256 public pendingApyBps;
    uint256 public apyChangeEffectiveAt;

    uint256 public yieldReserve;

    mapping(address => uint256) public principal;
    mapping(address => uint256) public depositTimestamp;
    mapping(address => uint256) public pendingYield;

    uint256 private constant MAX_APY_BPS = 10_000; // 100%
    uint256 private constant RATE_DELAY = 1 days;

    constructor(address initialOwner) Ownable(initialOwner) {
        usdc = 0x3600000000000000000000000000000000000000;
        apyBps = 500; // start at 5%
    }

    // ─── Owner actions ────────────────────────────────────────────────────────

    /// @notice Queue an APY change; takes effect after RATE_DELAY (1 day)
    function proposeApyBps(uint256 newBps) external onlyOwner {
        if (newBps > MAX_APY_BPS) revert RateTooHigh(MAX_APY_BPS, newBps);
        pendingApyBps = newBps;
        apyChangeEffectiveAt = block.timestamp + RATE_DELAY;
        emit RateProposed(newBps, apyChangeEffectiveAt);
    }

    /// @notice Apply the queued APY change after the delay has elapsed
    function applyApyBps() external {
        if (apyChangeEffectiveAt == 0) revert PendingRateNotQueued();
        if (block.timestamp < apyChangeEffectiveAt) revert RateChangeNotReady(apyChangeEffectiveAt);
        apyBps = pendingApyBps;
        apyChangeEffectiveAt = 0;
        pendingApyBps = 0;
        emit RateUpdated(apyBps);
    }

    /// @notice Owner funds the yield reserve so withdrawals can pay out yield
    function fundYieldReserve(uint256 amount) external onlyOwner {
        if (amount == 0) revert ZeroAmount();
        yieldReserve += amount;
        IERC20(usdc).safeTransferFrom(msg.sender, address(this), amount);
        emit YieldReserveFunded(amount);
    }

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    // ─── User actions ─────────────────────────────────────────────────────────

    function deposit(uint256 amount) external nonReentrant whenNotPaused {
        if (amount == 0) revert ZeroAmount();
        _settleYield(msg.sender);
        principal[msg.sender] += amount;
        depositTimestamp[msg.sender] = block.timestamp;
        IERC20(usdc).safeTransferFrom(msg.sender, address(this), amount);
        emit Deposited(msg.sender, amount);
    }

    function withdraw(uint256 amount) external nonReentrant whenNotPaused {
        if (amount == 0) revert ZeroAmount();
        uint256 avail = principal[msg.sender];
        if (avail < amount) revert InsufficientPrincipal(avail, amount);

        _settleYield(msg.sender);

        principal[msg.sender] -= amount;
        depositTimestamp[msg.sender] = principal[msg.sender] == 0 ? 0 : block.timestamp;

        uint256 accrued = pendingYield[msg.sender];
        uint256 yieldToPay = accrued > yieldReserve ? yieldReserve : accrued;

        if (yieldToPay > 0) {
            pendingYield[msg.sender] = accrued - yieldToPay;
            yieldReserve -= yieldToPay;
            emit YieldPaid(msg.sender, yieldToPay);
        }

        IERC20(usdc).safeTransfer(msg.sender, amount + yieldToPay);
        emit Withdrawn(msg.sender, amount, yieldToPay);
    }

    // ─── Views ────────────────────────────────────────────────────────────────

    function getAccruedYield(address user) external view returns (uint256) {
        return pendingYield[user] + _calculateUnsettledYield(user);
    }

    // ─── Internals ────────────────────────────────────────────────────────────

    function _settleYield(address user) internal {
        uint256 unsettled = _calculateUnsettledYield(user);
        if (unsettled > 0) pendingYield[user] += unsettled;
        if (principal[user] > 0) depositTimestamp[user] = block.timestamp;
    }

    function _calculateUnsettledYield(address user) internal view returns (uint256) {
        uint256 p = principal[user];
        uint256 start = depositTimestamp[user];
        if (p == 0 || start == 0 || apyBps == 0 || block.timestamp <= start) return 0;
        uint256 elapsed = block.timestamp - start;
        return (p * apyBps * elapsed) / (365 days * 10_000);
    }
}
