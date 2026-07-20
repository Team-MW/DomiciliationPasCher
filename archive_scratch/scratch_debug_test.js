import fs from 'fs';
const file = fs.readFileSync('tests/pdfGenerator.test.js', 'utf8');
const newFile = file.replace(
    "expect(representeParCall).toBeDefined();",
    "if(!representeParCall) { console.log('All drawText calls:', drawTextSpy.mock.calls.map(c => c[0])); }\n            expect(representeParCall).toBeDefined();"
);
fs.writeFileSync('tests/pdfGenerator.test.js', newFile);
