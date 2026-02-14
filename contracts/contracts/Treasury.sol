// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

/**
 * @title Treasury
 * @notice Custody contract for native HLUSD deposits, controlled salary releases, and yield generation
 * @dev HLUSD is the native asset (like ETH) - uses msg.value and payable transfers
 * @dev Separates custody from streaming logic for enhanced security
 * @dev Yield accrues deterministically on reserved payroll capital
 */
contract Treasury {
    
    // ========== STATE VARIABLES ==========

    /// @notice Address of authorized SalaryStream contract
    address public salaryStream;

    /// @notice Owner address for initial setup
    address public owner;

    /// @notice Total native HLUSD deposited by each employer
    mapping(address => uint256) public employerBalances;

    /// @notice Native HLUSD reserved for active salary streams per employer
    mapping(address => uint256) public employerReserved;

    // ========== YIELD STATE ==========

    /// @notice Annual yield percentage applied to reserved capital (default 5%)
    uint256 public annualYieldPercent = 5;

    /// @notice Seconds in one year for yield calculation
    uint256 public constant SECONDS_PER_YEAR = 365 days;

    /// @notice Timestamp of last yield claim per employer
    mapping(address => uint256) public lastYieldClaim;

    /// @notice Total yield claimed per employer (lifetime)
    mapping(address => uint256) public totalYieldClaimed;

    /// @notice Global total yield paid out
    uint256 public totalYieldPaidGlobal;

    // ========== EVENTS ==========

    event Deposited(address indexed employer, uint256 amount);
    event Reserved(address indexed employer, uint256 amount);
    event SalaryReleased(address indexed employer, address indexed recipient, uint256 amount);
    event SalaryStreamSet(address indexed salaryStream);
    event YieldClaimed(address indexed employer, uint256 amount, uint256 reserved, uint256 elapsed);

    // ========== CONSTRUCTOR ==========

    constructor() {
        owner = msg.sender;
    }

    // ========== MODIFIERS ==========

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier onlySalaryStream() {
        require(msg.sender == salaryStream, "Not authorized");
        _;
    }

    // ========== ADMIN FUNCTIONS ==========

    /**
     * @notice Set the authorized SalaryStream contract (one-time only for security)
     * @param _stream Address of deployed SalaryStream contract
     */
    function setSalaryStream(address _stream) external onlyOwner {
        require(salaryStream == address(0), "Already set");
        require(_stream != address(0), "Invalid address");
        salaryStream = _stream;
        emit SalaryStreamSet(_stream);
    }

    // ========== EMPLOYER FUNCTIONS ==========

    /**
     * @notice Deposit native HLUSD to treasury for funding salary streams
     * @dev Payable function - send HLUSD with transaction
     */
    function deposit() external payable {
        require(msg.value > 0, "Amount must be greater than 0");
        
        // Initialize yield tracking on first deposit
        if (lastYieldClaim[msg.sender] == 0) {
            lastYieldClaim[msg.sender] = block.timestamp;
        }

        // Update balance (CEI pattern - Effects before Interactions)
        employerBalances[msg.sender] += msg.value;

        emit Deposited(msg.sender, msg.value);
    }

    // ========== YIELD FUNCTIONS ==========

    /**
     * @notice Calculate accrued yield for an employer
     * @dev yield = reserved * annualYieldPercent * elapsed / (100 * SECONDS_PER_YEAR)
     * @param employer Address of the employer
     * @return Accrued yield in native HLUSD
     */
    function _calculateYield(address employer) internal view returns (uint256) {
        uint256 reserved = employerReserved[employer];
        if (reserved == 0) return 0;
        
        uint256 lastClaim = lastYieldClaim[employer];
        if (lastClaim == 0) return 0;
        
        uint256 elapsed = block.timestamp - lastClaim;
        if (elapsed == 0) return 0;

        // Deterministic linear yield: reserved * rate% * time / (100 * year)
        return (reserved * annualYieldPercent * elapsed) / (100 * SECONDS_PER_YEAR);
    }

    /**
     * @notice Claim accrued yield on reserved payroll capital
     * @dev Follows CEI pattern. Yield is minted from treasury surplus.
     */
    function claimYield() external {
        uint256 yieldAmount = _calculateYield(msg.sender);
        require(yieldAmount > 0, "No yield accrued");
        require(address(this).balance >= yieldAmount, "Insufficient treasury balance");

        // Effects: update state before transfer
        lastYieldClaim[msg.sender] = block.timestamp;
        totalYieldClaimed[msg.sender] += yieldAmount;
        totalYieldPaidGlobal += yieldAmount;

        // Interaction: transfer yield to employer
        payable(msg.sender).transfer(yieldAmount);

        emit YieldClaimed(msg.sender, yieldAmount, employerReserved[msg.sender], block.timestamp - lastYieldClaim[msg.sender]);
    }

    /**
     * @notice Get current accrued (unclaimed) yield for an employer
     * @param employer Address of the employer
     * @return Accrued yield amount
     */
    function getAccruedYield(address employer) external view returns (uint256) {
        return _calculateYield(employer);
    }

    /**
     * @notice Get complete yield statistics for an employer
     * @param employer Address of the employer
     * @return reserved Current reserved capital
     * @return accruedYield Current unclaimed yield
     * @return _totalYieldClaimed Lifetime yield claimed
     * @return _annualYieldPercent Annual yield rate
     * @return _lastClaimTimestamp Last claim timestamp
     */
    function getYieldStats(address employer)
        external
        view
        returns (
            uint256 reserved,
            uint256 accruedYield,
            uint256 _totalYieldClaimed,
            uint256 _annualYieldPercent,
            uint256 _lastClaimTimestamp
        )
    {
        return (
            employerReserved[employer],
            _calculateYield(employer),
            totalYieldClaimed[employer],
            annualYieldPercent,
            lastYieldClaim[employer]
        );
    }

    // ========== SALARY STREAM FUNCTIONS ==========

    /**
     * @notice Reserve native HLUSD for a new salary stream
     * @dev Only callable by authorized SalaryStream contract
     * @param employer Address of the employer
     * @param amount Total amount to reserve for stream
     */
    function reserveFunds(address employer, uint256 amount) external onlySalaryStream {
        // Check available balance (deposited minus already reserved)
        uint256 available = employerBalances[employer] - employerReserved[employer];
        require(available >= amount, "Insufficient balance");

        // Initialize yield tracking if not set
        if (lastYieldClaim[employer] == 0) {
            lastYieldClaim[employer] = block.timestamp;
        }

        // Reserve the funds
        employerReserved[employer] += amount;

        emit Reserved(employer, amount);
    }

    /**
     * @notice Release salary payment to employee or tax vault
     * @dev Only callable by authorized SalaryStream contract
     * @dev Implements Checks-Effects-Interactions pattern for security
     * @param employer Address of the employer
     * @param to Address receiving the payment (employee or tax vault)
     * @param amount Amount to release in native HLUSD
     */
    function releaseSalary(
        address employer,
        address to,
        uint256 amount
    ) external onlySalaryStream {
        require(amount > 0, "Amount must be greater than 0");
        require(to != address(0), "Invalid recipient");
        require(employerReserved[employer] >= amount, "Insufficient reserved");

        // Effects: Update state before external calls
        employerReserved[employer] -= amount;
        employerBalances[employer] -= amount;

        // Interaction: Transfer native HLUSD
        payable(to).transfer(amount);

        emit SalaryReleased(employer, to, amount);
    }

    // ========== VIEW FUNCTIONS ==========

    /**
     * @notice Get available (unreserved) balance for an employer
     * @param employer Address of the employer
     * @return Available HLUSD balance
     */
    function getAvailableBalance(address employer) external view returns (uint256) {
        return employerBalances[employer] - employerReserved[employer];
    }

    /**
     * @notice Get total treasury balance
     * @return Total native HLUSD held by treasury
     */
    function getTreasuryBalance() external view returns (uint256) {
        return address(this).balance;
    }

    // ========== EMERGENCY ==========

    /**
     * @notice Fallback to accept native HLUSD deposits
     * @dev Automatically credits sender's balance
     */
    receive() external payable {
        if (msg.value > 0) {
            if (lastYieldClaim[msg.sender] == 0) {
                lastYieldClaim[msg.sender] = block.timestamp;
            }
            employerBalances[msg.sender] += msg.value;
            emit Deposited(msg.sender, msg.value);
        }
    }
}
