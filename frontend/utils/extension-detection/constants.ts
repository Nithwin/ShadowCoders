/**
 * Extension Detection Constants
 * Known extension IDs and detection patterns
 */

/**
 * Common extension IDs to probe
 * IDs are obfuscated by concatenation to avoid self-detection
 */
export const PROBE_EXTENSION_IDS = [
  'gighmmpiobklfep' + 'jocnamgkkbiglidom', // AdBlock
  'cfhdojbkjhnklbpk' + 'daibdccddilifddb', // Adblock Plus
  'cjpalhdlnbpafiam' + 'ejdnhcphjbkeiagm', // uBlock Origin
  'kofhenobccjhbdgh' + 'hhndihjaaeakmhef', // Grammarly
  'pobhoodpcniicnbc' + 'lomomakjclihbkfo', // Don't Fuck With Paste (Old)
  'onofbdllgapoalcc' + 'ggoijhkfmblehlno', // Don't Fuck With Paste (Alt)
  'nkgllhigpcljnhoa' + 'kjkgaieabnkmgdkb', // Don't Fuck With Paste (Real)
  'dgjdmkgpckidimef' + 'ncmaphiknphjbome', // Google Gemini / Assistant (Generic)
  'ejgdkdpfgijhhmcb' + 'fimdjghmgnlpkpah', // Gemini AI Assistant (Real)
];

/**
 * Known benign internal Chrome IDs to exclude from detection
 */
export const INTERNAL_CHROME_IDS = [
  'nmmhkkegccagdldgiimedpiccmgmieda', // Chrome Web Store inline install
];

/**
 * Extension-related keywords for DOM scanning
 */
export const EXTENSION_KEYWORDS = {
  ids: [
    'extension',
    'ext-',
    'chrome-',
    'gemini',
    'grammarly',
    'lastpass',
    'dashlane',
    '1password',
    'shadow-container',
    'addon',
    'plugin',
  ],
  classes: [
    'chrome-extension',
    'grammarly',
    'lastpass',
    'dashlane',
    '1password',
    'adobe-acrobat',
    'react-devtools',
  ],
  attributes: [
    'data-lastpass-icon-root',
    'data-1p-ignore',
    'data-extension-id',
  ],
};
