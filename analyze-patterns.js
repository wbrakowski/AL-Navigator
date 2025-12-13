// Pattern analysis for 1250 untranslated objects
// This will read from a file or analyze the hardcoded list
const fs = require('fs');

// You can paste the complete list here or read from a file
let fullData = '';

// Try to read from file first
try {
    fullData = fs.readFileSync('untranslated-full.txt', 'utf8');
    console.log('Reading from untranslated-full.txt');
} catch (e) {
    // Use sample if file doesn't exist
    console.log('File not found, using analysis mode with placeholders');
}

// Extract all object names
const lines = data.split('\n');
const names = [];
lines.forEach(line => {
    const match = line.match(/"([^"]+)"/);
    if (match) {
        names.push(match[1]);
    }
});

console.log(`\nTotal names found: ${names.length}\n`);

// Define patterns to search for
const suffixPatterns = [
    'Part', 'Preview', 'Card', 'List', 'Setup', 'FactBox', 'Lines',
    'Names', 'Wizard', 'Subpage', 'Subform', 'Entity', 'Matrix',
    'Activities', 'Statistics', 'Register', 'Sheet', 'Dialog',
    'Buffer', 'RC', 'Activity'
];

const prefixPatterns = [
    'Email', 'CRM', 'Azure AD', 'Office 365', 'Power BI', 'IC ',
    'APIV2 -', 'Workflow', 'O365', 'Headline RC', 'G/L', 'Job',
    'Config.', 'Mini', 'Pstd.', 'Posted', 'Standard', 'My '
];

// Count patterns
const suffixCounts = new Map();
const prefixCounts = new Map();

names.forEach(name => {
    // Check suffixes
    suffixPatterns.forEach(suffix => {
        if (name.endsWith(suffix) || name.endsWith(' ' + suffix)) {
            suffixCounts.set(suffix, (suffixCounts.get(suffix) || 0) + 1);
        }
    });

    // Check prefixes
    prefixPatterns.forEach(prefix => {
        if (name.startsWith(prefix)) {
            prefixCounts.set(prefix, (prefixCounts.get(prefix) || 0) + 1);
        }
    });
});

// Sort and display
console.log('=== TOP SUFFIX PATTERNS ===');
[...suffixCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .forEach(([pattern, count]) => {
        console.log(`  ${pattern.padEnd(15)} : ${count} occurrences`);
    });

console.log('\n=== TOP PREFIX PATTERNS ===');
[...prefixCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .forEach(([pattern, count]) => {
        console.log(`  ${pattern.padEnd(15)} : ${count} occurrences`);
    });

console.log('\n=== SAMPLE OBJECTS PER PATTERN ===');
console.log('\nSuffix "Part":');
names.filter(n => n.endsWith('Part') || n.endsWith(' Part')).slice(0, 5).forEach(n => console.log(`  - ${n}`));

console.log('\nSuffix "Preview":');
names.filter(n => n.endsWith('Preview') || n.endsWith(' Preview')).slice(0, 5).forEach(n => console.log(`  - ${n}`));

console.log('\nPrefix "Job":');
names.filter(n => n.startsWith('Job')).slice(0, 5).forEach(n => console.log(`  - ${n}`));
