// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title ApiPayments — prepaid USDC credits for pay-per-use API access
contract ApiPayments is Ownable2Step, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ─── Custom Errors ────────────────────────────────────────────────────────
    error ZeroAmount();
    error EmptyApiId();
    error ZeroPricePerCall();
    error ApiAlreadyRegistered(bytes32 key);
    error ApiInactive(bytes32 key);
    error InsufficientCredits(address user, bytes32 key, uint256 available, uint256 requested);
    error InsufficientRevenue(bytes32 key, uint256 available, uint256 requested);
    error ZeroAddress();
    error NotAuthorizedCaller();
    error NoRevenue(bytes32 key);

    // ─── Events ───────────────────────────────────────────────────────────────
    event ApiRegistered(bytes32 indexed key, string apiId, uint256 pricePerCall);
    event ApiDeactivated(bytes32 indexed key, string apiId);
    event CreditsPurchased(bytes32 indexed key, address indexed user, uint256 callCount, uint256 cost);
    event CreditConsumed(bytes32 indexed key, address indexed user);
    event RevenueWithdrawn(bytes32 indexed key, uint256 amount);
    event CreditsRefunded(bytes32 indexed key, address indexed user, uint256 callCount, uint256 refundAmount);
    event AuthorizedCallerUpdated(address indexed newCaller);

    // ─── State ────────────────────────────────────────────────────────────────
    address public immutable usdc;
    address public authorizedCaller;

    struct Api {
        uint256 pricePerCall;     // USDC (6 decimals), locked at registration
        uint256 revenue;          // accumulated USDC owed to owner
        bool active;
    }

    mapping(bytes32 => Api) public apis;
    /// @dev credits[apiKey][user] = number of calls remaining
    mapping(bytes32 => mapping(address => uint256)) public credits;

    modifier onlyAuthorizedCaller() {
        if (msg.sender != authorizedCaller) revert NotAuthorizedCaller();
        _;
    }

    constructor(address initialOwner, address initialAuthorizedCaller) Ownable(initialOwner) {
        if (initialAuthorizedCaller == address(0)) revert ZeroAddress();
        usdc = 0x3600000000000000000000000000000000000000;
        authorizedCaller = initialAuthorizedCaller;
    }

    // ─── Owner actions ────────────────────────────────────────────────────────

    /// @notice Register a new API endpoint. Price is locked and cannot be changed.
    /// @dev To reprice, deactivate the old key and register a new apiId version.
    function registerApi(string calldata apiId, uint256 pricePerCall) external onlyOwner {
        if (bytes(apiId).length == 0) revert EmptyApiId();
        if (pricePerCall == 0) revert ZeroPricePerCall();
        bytes32 key = _apiKey(apiId);
        if (apis[key].active) revert ApiAlreadyRegistered(key);
        apis[key] = Api({pricePerCall: pricePerCall, revenue: 0, active: true});
        emit ApiRegistered(key, apiId, pricePerCall);
    }

    /// @notice Deactivate an API (blocks new credit purchases; existing credits still consumable)
    function deactivateApi(string calldata apiId) external onlyOwner {
        bytes32 key = _apiKey(apiId);
        apis[key].active = false;
        emit ApiDeactivated(key, apiId);
    }

    /// @notice Withdraw all accumulated revenue for an API
    function withdrawRevenue(string calldata apiId) external onlyOwner nonReentrant {
        bytes32 key = _apiKey(apiId);
        uint256 amount = apis[key].revenue;
        if (amount == 0) revert NoRevenue(key);
        apis[key].revenue = 0;
        IERC20(usdc).safeTransfer(msg.sender, amount);
        emit RevenueWithdrawn(key, amount);
    }

    /// @notice Refund unused credits to a user (uses locked price at registration)
    function refundCredits(
        string calldata apiId,
        address user,
        uint256 callCount
    ) external onlyOwner nonReentrant {
        if (user == address(0)) revert ZeroAddress();
        if (callCount == 0) revert ZeroAmount();
        bytes32 key = _apiKey(apiId);
        Api storage api = apis[key];
        uint256 userCredits = credits[key][user];
        if (userCredits < callCount) revert InsufficientCredits(user, key, userCredits, callCount);

        uint256 refundAmount = api.pricePerCall * callCount; // locked price, safe
        if (api.revenue < refundAmount) revert InsufficientRevenue(key, api.revenue, refundAmount);

        credits[key][user] -= callCount;
        api.revenue -= refundAmount;

        IERC20(usdc).safeTransfer(user, refundAmount);
        emit CreditsRefunded(key, user, callCount, refundAmount);
    }

    function setAuthorizedCaller(address caller) external onlyOwner {
        if (caller == address(0)) revert ZeroAddress();
        authorizedCaller = caller;
        emit AuthorizedCallerUpdated(caller);
    }

    // ─── User actions ─────────────────────────────────────────────────────────

    function buyCredits(string calldata apiId, uint256 callCount) external nonReentrant {
        if (callCount == 0) revert ZeroAmount();
        bytes32 key = _apiKey(apiId);
        Api storage api = apis[key];
        if (!api.active) revert ApiInactive(key);

        uint256 cost = api.pricePerCall * callCount;

        credits[key][msg.sender] += callCount;
        api.revenue += cost;

        IERC20(usdc).safeTransferFrom(msg.sender, address(this), cost);
        emit CreditsPurchased(key, msg.sender, callCount, cost);
    }

    // ─── Backend (authorized caller) ──────────────────────────────────────────

    function consumeCredit(address user, string calldata apiId) external onlyAuthorizedCaller {
        bytes32 key = _apiKey(apiId);
        uint256 userCredits = credits[key][user];
        if (userCredits == 0) revert InsufficientCredits(user, key, 0, 1);
        credits[key][user] = userCredits - 1;
        emit CreditConsumed(key, user);
    }

    // ─── Views ────────────────────────────────────────────────────────────────

    function getCredits(string calldata apiId, address user) external view returns (uint256) {
        return credits[_apiKey(apiId)][user];
    }

    function getApi(string calldata apiId) external view returns (Api memory) {
        return apis[_apiKey(apiId)];
    }

    // ─── Internals ────────────────────────────────────────────────────────────

    function _apiKey(string calldata apiId) internal pure returns (bytes32) {
        return keccak256(bytes(apiId));
    }
}
