// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

/**
 * @title Treasury
 * @notice Custody contract for native HLUSD deposits and controlled salary releases
 * @dev HLUSD is the native asset (like ETH) - uses msg.value and payable transfers
 * @dev Separates custody from streaming logic for enhanced security
 * @dev Gas-optimized with minimal storage operations
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

    // ========== EVENTS ==========

    event Deposited(address indexed employer, uint256 amount);
    event Reserved(address indexed employer, uint256 amount);
    event SalaryReleased(address indexed employer, address indexed recipient, uint256 amount);
    event SalaryStreamSet(address indexed salaryStream);

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
        
        // Update balance (CEI pattern - Effects before Interactions)
        employerBalances[msg.sender] += msg.value;

        emit Deposited(msg.sender, msg.value);
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
            employerBalances[msg.sender] += msg.value;
            emit Deposited(msg.sender, msg.value);
        }
    }
}
