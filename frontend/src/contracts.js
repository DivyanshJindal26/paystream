// export const TREASURY_ADDRESS = "0xffA79E306f877370e2592Ba4030D1a869C1f4B4a";
// export const STREAM_ADDRESS = "0xeD878261E8cA28d0E50Fc9F74B606cf93A5a9A46";
export const TREASURY_ADDRESS = "0x1b259f63Fd9085477b6eB0f73466596B7C22992d";
export const STREAM_ADDRESS = "0xbab9A726c54233E1F81494A1B9C5D2b5A8b9497C";

export const TREASURY_ABI = [
  "function deposit() external payable",
  "function employerBalances(address) external view returns (uint256)",
  "function employerReserved(address) external view returns (uint256)",
  "function getAvailableBalance(address) external view returns (uint256)",
  "function getTreasuryBalance() external view returns (uint256)"
];

export const STREAM_ABI = [
  "function createStream(address employee, uint256 monthlySalary, uint256 durationInMonths, uint256 taxPercent) external",
  "function withdraw() external",
  "function streams(address) external view returns (address employer, uint256 monthlySalary, uint256 ratePerSecond, uint256 startTime, uint256 endTime, uint256 withdrawn, uint256 totalAllocated, uint256 taxPercent, bool paused, bool exists)",
  "function getWithdrawable(address) external view returns (uint256)",
  "function getEarned(address) external view returns (uint256)",
  "function getStreamDetails(address) external view returns (tuple(address employer, uint256 monthlySalary, uint256 ratePerSecond, uint256 startTime, uint256 endTime, uint256 withdrawn, uint256 totalAllocated, uint256 taxPercent, bool paused, bool exists))",
  "function hasStream(address) external view returns (bool)",
  "function admin() external view returns (address)",
  "function pauseStream(address) external",
  "function resumeStream(address) external",
  "function cancelStream(address) external",
  "function getAllEmployees() external view returns (address[])",
  "function getActiveEmployees() external view returns (address[])",
  "function getEmployeesByEmployer(address) external view returns (address[])",
  "function getGlobalStats() external view returns (uint256, uint256, uint256, uint256)",
  "function getTotalWithdrawable() external view returns (uint256)",
  "function getEmployerStats(address) external view returns (uint256, uint256, uint256, uint256)",
  "event StreamCreated(address indexed employer, address indexed employee, uint256 monthlySalary, uint256 durationMonths, uint256 taxPercent, uint256 startTime)"
];