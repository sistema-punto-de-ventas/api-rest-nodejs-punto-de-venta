class ManejoDesString{

    static async toUperCaseFirstCharacter(stringData="algo"){

        try{
            var word = await stringData.toLowerCase(); 
            var newData = await  word[0].toUpperCase()+word.slice(1);
            return newData;
        }catch(e){
            console.log("Error al capitalizar la primera letra de la palabra");
            return stringData;
        }

    }
}

module.exports= ManejoDesString;