import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  SCE_APPROVED_MASTER_ASSETS,
  SCE_APPROVED_MASTER_ICON_NAMES,
  type SceApprovedMasterIconName,
} from "./approved-hero-meta";

/** Stable geometry fingerprint — style defaults stripped; vector markup preserved. */
export function fingerprintApprovedHeroMasterSvg(relativePath: string): string {
  const raw = readFileSync(join(process.cwd(), relativePath), "utf8");
  const geometry = raw
    .replace(/\sstyle="[^"]*"/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  return createHash("sha256").update(geometry).digest("hex");
}

export const SCE_APPROVED_HERO_GEOMETRY_FINGERPRINTS: Record<SceApprovedMasterIconName, string> =
  Object.fromEntries(
    SCE_APPROVED_MASTER_ICON_NAMES.map((name) => [
      name,
      fingerprintApprovedHeroMasterSvg(SCE_APPROVED_MASTER_ASSETS[name]),
    ]),
  ) as Record<SceApprovedMasterIconName, string>;

/** Baseline fingerprints — hero + org/work (04R1) + platform Batch 2 (05) + people ops Batch 3 (06). */
export const SCE_APPROVED_MASTER_BASELINE_FINGERPRINTS = {
  dashboard: "f72ca981769dfc233add2addcab754ccbc019d2b2c374cb58e6f38cd05faca6c" as const,
  "week-planner":
    "89fd2f4fff8288b2ccce61d9fab276ae0aaead53ac509fa5b6215a58b809d94b" as const,
  training: "5412eb95db8006bf6d14c2db696e858c39091305a356ffb4c7bfe515d57502b9" as const,
  tournament: "ffac43e245fb1996904e61ef56b9ba3d73b400e13665f03b17159a7366f5620a" as const,
  match: "4db02f2f64ba87344fb2497afbb72f3c417ca9f47bb006ab79791e4ae626f64e" as const,
  team: "8401ad03731b46e3b5f691c13afb714f84107fbae021d66f53bdaff44d5b2651" as const,
  season: "e49596cef5b50b488d2723aba483b6aa4bed7834b3ce24d6080faafc125235d3" as const,
  standings: "9328a0f826433c4cf84b5fd8a2db1ae13624a11ca51b99d8162d0c82fe8165cb" as const,
  results: "46aff592c19bb0d1e1a40a5e96a360670a8b50d869996e39a8d9ddae753fd95e" as const,
  attendance: "e7348632f2e88c23f48583f7d25f3972a865715bc6a95666c0b3d183ee09e469" as const,
  pitch: "aec133490ecba2ee71e60278ad36f14c3aa3ff303a8f9c1947367d5442fb0402" as const,
  "dressing-room":
    "217ca2230357dc51479c448ecdd003eeff92e1f76921d12267e56606a3029098" as const,
  organisation: "ecfb2e74fb477d24aaa8dbc3b282ba665cd8b76d3c313c0be2c2a582070501ce" as const,
  "org-unit": "ed175268e7d91f00026267cb77922c4e1fab72b02ca9f9fd3649fe9fde253c78" as const,
  people: "b62ec1d27e0f0f2e2a572e534df113586a3be898751c08f109dccbd86cad837b" as const,
  "roles-access":
    "402dab784827073f7035938efffc8b2fcd13b03ae2f62a05a2b93ec2f7dc28d9" as const,
  club: "c93d895992b9296399f245ae9db48bf6c1bf357b9a02679bc158105834902427" as const,
  documents: "43618d66631c0b92860c59276d18cb24b79c84f69d7053e87a3fd3b529d492ff" as const,
  tasks: "3a8fd042779e167fbeb656928cdc597d09f098ad9587f27d893a68c2ba033361" as const,
  requirements: "07960715a2747981e9df71c0f32ca4bcc3615dd0ca7d33154e12477d4ed7f594" as const,
  events: "6e1c55b97d35af7e586010256f34dacbaf83f5eb111f3fede94fe162472e9841" as const,
  communication:
    "23be2484f7a80cf7221065b96d0ac3df7c7f9627f7cd1fe489a4f05395962582" as const,
  attention: "9c575e13ad6797602e47034e29a39acdada196dac64a277f98f3a33647ad586e" as const,
  audit: "15acdf9852ac5a1a43de0f4781ce880d71d33018226344993afe21a901af2ec0" as const,
  "billing-invoice":
    "1dda10e7e9569551953e36ee8062b2e1e26c1d0892028d59946d6781cfb3eb53" as const,
  conflict: "00a74ef6df00b29f71e487d10d3416a115170d09fcddfdf4a414cd0699423493" as const,
  infoboard: "7a5ee66eb81012ea34142ad9a5d16f535f4cd2c361d0b1226b78b21bb9d69a43" as const,
  news: "091c0ed2a7262a1a3a82b88e0eedffb4e0fc85b595efd9480516d20dce6e349c" as const,
  notifications:
    "e9dc7266848f0d13645c89581ad5ebda7476f4f4a4b47953193f1a6aa52f0753" as const,
  planning: "40e7815241843fe34712d4ea7e20c4b63e80428ea5407a66c2e0b540e6af8f80" as const,
  publish: "491e22ece51de7f4aa9cf4a298bf20be80309e0bc5eb7bd512cd451f4ca591ff" as const,
  "resource-allocation":
    "402a73c316b04893d831f6747b352cd60c0dbfae4187d6f4381d4b4dda959ff3" as const,
  settings: "3f6ffa40fb6bbac1c295c53d676b86122eb55548d4a9d83fa15a7de599d832fc" as const,
  website: "110c2cadf1d313873a6d06ae86b5f12a8f0d93dfac9f74148049e81db61f555e" as const,
  absence: "d6f04a6fba18c2013c1ba98c7431d1c0445a1be1a9c46a5a168ef4ea845f6aeb" as const,
  assignment: "d8c767e9ff9a002db9d77d7d8d1bb19cdc2f175fd2748575f4d6e19b87f1446c" as const,
  availability: "168058f0ceaac26685c9a470386c729fd4e86b7c4d4592f0abff26c0b762c68e" as const,
  "check-in": "2721f3da038f5272dda41a925031e4bb8408af75212e746b3dcf3663a35ba89e" as const,
  coach: "cb6c33dcf52b7fee469c0028328746dd9a30b73e6cbb424c33cfcd077d4e86a9" as const,
  "committee-board":
    "d3ec618f2552e825251e0680facce65f5bf2bd9886307b61444c1ac6a2774531" as const,
  contact: "db03da568e731efe8ac95becffb14b204fee1b50950248ebe1be0fdcab7a8b1f" as const,
  facility: "9603af97a16f62eb668e15d206f891fe8722cb929061faf6123a1487c58f15fe" as const,
  "guardian-parent":
    "1f2e336e4e0c2ef57de279655d77e7bdfd8b9f10faed422df3c181b3c7c88c33" as const,
  invitation: "7d186a188df96b41de0541900d5e4385eb4e8e681eeb28e91f76557b20ece1de" as const,
  member: "9cd415dc4427de23deb1561b9df7940231f57fa69f82c61106fcdc7ba76ecf14" as const,
  partner: "0c34d2b4184e1e553caa29661c3783db0ab821f806d5ef561ded90ade7e0284b" as const,
  player: "63b922e20302125c522ff45d6f3cdc390b64c57e796b2df6a9121672c5d1232e" as const,
  sponsor: "803873d8615457a4812fc6a15493d68f5a3e695815a9001894df7490b4cf99c1" as const,
  "team-management":
    "50e5f218bf793f08ac29d69ed1801723610ac79e6010194a1bed6e67aaf7f76c" as const,
  volunteer: "f8261f1f750cefd86a7420fa7d27b6fe18508125785de682eaa587152e99b2f8" as const,
} as const;
