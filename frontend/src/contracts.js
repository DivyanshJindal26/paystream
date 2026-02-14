// export const TREASURY_ADDRESS = "0xffA79E306f877370e2592Ba4030D1a869C1f4B4a";
// export const STREAM_ADDRESS = "0xeD878261E8cA28d0E50Fc9F74B606cf93A5a9A46";
export const TREASURY_ADDRESS = import.meta.env.VITE_TREASURY_CONTRACT;
export const STREAM_ADDRESS = import.meta.env.VITE_STREAM_CONTRACT;
export const OFFRAMP_ADDRESS = import.meta.env.VITE_OFFRAMP_CONTRACT;   

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

export const OFFRAMP_ABI = [
  "function oracleSigner() external view returns (address)",
  "function feePercent() external view returns (uint256)",
  "function totalVolumeHLUSD() external view returns (uint256)",
  "function totalFeesCollected() external view returns (uint256)",
  "function totalConversions() external view returns (uint256)",
  "function convertToFiat(uint256 rate, uint256 timestamp, bytes calldata signature) external payable",
  "function conversions(uint256) external view returns (address user, uint256 hlusdAmount, uint256 inrAmount, uint256 feeAmount, uint256 rateUsed, uint256 timestamp)",
  "function getUserConversions(address user) external view returns (uint256[])",
  "function getConversion(uint256 conversionId) external view returns (tuple(address user, uint256 hlusdAmount, uint256 inrAmount, uint256 feeAmount, uint256 rateUsed, uint256 timestamp))",
  "function getStats() external view returns (uint256 volume, uint256 fees, uint256 count)",
  "function withdrawFees(address payable recipient) external",
  "event ConversionExecuted(uint256 indexed conversionId, address indexed user, uint256 hlusdAmount, uint256 inrAmount, uint256 feeAmount, uint256 rateUsed, uint256 timestamp)",
  "event FeesWithdrawn(address indexed recipient, uint256 amount)"
];