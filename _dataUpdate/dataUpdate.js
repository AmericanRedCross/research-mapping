const fs = require('fs');
const path = require('path');

const async = require('async');
const needle = require('needle');

const dataUrl = "https://docs.google.com/spreadsheets/d/1NgKu_88w4Im7fWeosuRdzLeIg1qG26q0x70RYULdew0/pub?output=csv";

console.log("fetching data...");
var needleOptions = {
  follow_max : 10    // follow up to ten redirects
}
needle.get(dataUrl, needleOptions, function(error, response) {
  if (!error && response.statusCode == 200){
    var outputFile = path.join('../','data','research-mapping.csv');
    console.log(outputFile)
    if (fs.existsSync(outputFile)) {
      fs.unlinkSync(outputFile);
    }
    console.log("writing file...");
    fs.writeFileSync(outputFile, response.body, 'utf8');
    console.log("done.")
  } else {
    console.log("error: ", error)
  }
});
