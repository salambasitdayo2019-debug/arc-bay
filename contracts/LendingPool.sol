// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title LendingPool — LP deposit/earn + over-collateralized USDC borrowing
/// @notice Pause policy:
///   - depositLP + borrow are paused in emergencies (new positions blocked)
///   - withdrawLP, repay, liquidate are intentionally NOT paused so users can always exit
contract LendingPool is Ownable2Step, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ─── Custom Errors ────────────────────────────────────────────────────────
    error ZeroAmount();
    error ZeroShares();
    error InsufficientShares(uint256 available, uint256 requested);
    error UtilizationCapExceeded();
    error InactiveLoan(uint256 loanId);
    error NotBorrower(uint256 loanId);
    error NotLiquidatable(uint256 loanId, uint256 readyAt);

    // ─── Events ───────────────────────────────────────────────────────────────
    event LPDeposited(address indexed lp, uint256 amount, uint256 sharesMinted);
    event LPWithdrawn(address indexed lp, uint256 shareAmount, uint256 usdcAmount);
    event Borrowed(uint256 indexed loanId, address indexed borrower, uint256 amount, uint256 collateral);
    event Repaid(uint256 indexed loanId, uint256 interest);
    event Liquidated(uint256 indexed loanId, address indexed liquidator, uint256 collateral);

    // ─── State ────────────────────────────────────────────────────────────────
    address public immutable usdc;

    uint256 public constant LP_APY_BPS     = 500;   // 5% — for display purposes; interest accrues via share inflation
    uint256 public constant BORROW_APY_BPS = 800;   // 8%
    uint256 public constant COLLATERAL_RATIO  = 150; // 150% collateral required
    uint256 public constant MAX_LOAN_DURATION = 30 days; // loans past this are liquidatable

    uint256 public totalShares;
    uint256 public totalPoolUSDC; // LP principal + accrued interest — source of truth for share value

    mapping(address => uint256) public shares;

    struct Loan {
        address borrower;
        uint256 principal;
        uint256 collateral;
        uint256 startTime;
        bool active;
    }

    mapping(uint256 => Loan) public loans;
    uint256 public nextLoanId;

    constructor(address initialOwner) Ownable(initialOwner) {
        usdc = 0x3600000000000000000000000000000000000000;
    }

    // ─── Owner actions ────────────────────────────────────────────────────────

    /// @notice Pause blocks new deposits and borrows only; exits always work
    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    // ─── LP actions ───────────────────────────────────────────────────────────

    /// @dev Paused in emergencies — no new LP positions during incident
    function depositLP(uint256 amount) external nonReentrant whenNotPaused {
        if (amount == 0) revert ZeroAmount();

        uint256 mintedShares;
        if (totalShares == 0 || totalPoolUSDC == 0) {
            mintedShares = amount;
        } else {
            mintedShares = (amount * totalShares) / totalPoolUSDC;
            if (mintedShares == 0) revert ZeroShares();
        }

        shares[msg.sender] += mintedShares;
        totalShares += mintedShares;
        totalPoolUSDC += amount;

        IERC20(usdc).safeTransferFrom(msg.sender, address(this), amount);
        emit LPDeposited(msg.sender, amount, mintedShares);
    }

    /// @dev Intentionally NOT paused — LPs must always be able to exit
    function withdrawLP(uint256 shareAmount) external nonReentrant {
        if (shareAmount == 0) revert ZeroShares();
        uint256 userShares = shares[msg.sender];
        if (userShares < shareAmount) revert InsufficientShares(userShares, shareAmount);
        if (totalShares == 0) revert ZeroShares();

        uint256 usdcAmount = (shareAmount * totalPoolUSDC) / totalShares;
        if (usdcAmount == 0) revert ZeroAmount();

        shares[msg.sender] -= shareAmount;
        totalShares -= shareAmount;
        totalPoolUSDC -= usdcAmount;

        IERC20(usdc).safeTransfer(msg.sender, usdcAmount);
        emit LPWithdrawn(msg.sender, shareAmount, usdcAmount);
    }

    // ─── Borrower actions ─────────────────────────────────────────────────────

    /// @dev Paused in emergencies — no new borrows during incident
    function borrow(uint256 amount) external nonReentrant whenNotPaused {
        if (amount == 0) revert ZeroAmount();
        if (amount > (totalPoolUSDC * 80) / 100) revert UtilizationCapExceeded();

        uint256 collateral = (amount * COLLATERAL_RATIO) / 100;

        uint256 loanId = nextLoanId;
        nextLoanId = loanId + 1;

        // CEI: update state before external calls
        totalPoolUSDC -= amount;
        loans[loanId] = Loan({
            borrower: msg.sender,
            principal: amount,
            collateral: collateral,
            startTime: block.timestamp,
            active: true
        });

        IERC20(usdc).safeTransferFrom(msg.sender, address(this), collateral);
        IERC20(usdc).safeTransfer(msg.sender, amount);

        emit Borrowed(loanId, msg.sender, amount, collateral);
    }

    /// @dev Intentionally NOT paused — borrowers must always be able to repay
    function repay(uint256 loanId) external nonReentrant {
        Loan storage loan = loans[loanId];
        if (!loan.active) revert InactiveLoan(loanId);
        if (loan.borrower != msg.sender) revert NotBorrower(loanId);

        uint256 elapsed = block.timestamp - loan.startTime;
        uint256 interest = (loan.principal * BORROW_APY_BPS * elapsed) / (365 days * 10_000);
        uint256 repayment = loan.principal + interest;
        uint256 collateral = loan.collateral;

        // CEI: update state before external calls
        loan.active = false;
        loan.collateral = 0;
        totalPoolUSDC += repayment; // interest inflates pool, boosting LP share value

        IERC20(usdc).safeTransferFrom(msg.sender, address(this), repayment);
        IERC20(usdc).safeTransfer(msg.sender, collateral);

        emit Repaid(loanId, interest);
    }

    /// @dev Intentionally NOT paused — liquidators must always be able to resolve bad loans
    function liquidate(uint256 loanId) external nonReentrant {
        Loan storage loan = loans[loanId];
        if (!loan.active) revert InactiveLoan(loanId);
        uint256 readyAt = loan.startTime + MAX_LOAN_DURATION;
        if (block.timestamp <= readyAt) revert NotLiquidatable(loanId, readyAt);

        uint256 collateral = loan.collateral;

        // CEI: update state before emitting
        loan.active = false;
        loan.collateral = 0;
        totalPoolUSDC += collateral; // collateral flows to LP pool

        emit Liquidated(loanId, msg.sender, collateral);
    }

    // ─── Views ────────────────────────────────────────────────────────────────

    function getShareValue(address lp) external view returns (uint256) {
        if (totalShares == 0) return 0;
        return (shares[lp] * totalPoolUSDC) / totalShares;
    }

    function getLoan(uint256 loanId) external view returns (Loan memory) {
        return loans[loanId];
    }

    /// @notice Current interest owed on a loan (for display)
    function getInterestOwed(uint256 loanId) external view returns (uint256) {
        Loan storage loan = loans[loanId];
        if (!loan.active) return 0;
        uint256 elapsed = block.timestamp - loan.startTime;
        return (loan.principal * BORROW_APY_BPS * elapsed) / (365 days * 10_000);
    }
}
