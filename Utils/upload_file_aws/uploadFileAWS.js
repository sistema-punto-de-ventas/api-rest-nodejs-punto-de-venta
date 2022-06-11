'use strict'

const AWS = require('aws-sdk');
const fs = require('fs-extra');

const s3 = new AWS.S3({
    accessKeyId:"AKIAU6RA37O4ID2JTPIG",
    secretAccessKey:"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"
});

const UplaodFileAWS = async(phisycalPath, nameFile)=>{

        console.log(phisycalPath);
        console.log(nameFile);
    
       try{
            const data = await fs.readFile(phisycalPath);
            var params = {
                Bucket: 'bucket-images-demos',
                Key: nameFile,
                Body: data
            }
            console.log(data);
            const urlImage = await s3.upload(params).promise();
            fs.unlink(phisycalPath)
            return urlImage.Location;
       }catch(err){
              console.log(err);
              return null;
       }
    
}

module.exports={
    UplaodFileAWS
}