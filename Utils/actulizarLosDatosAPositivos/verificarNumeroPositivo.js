class VerificarNumerosPositivos{

    static async verifyNumber(dataNumber){
        try{
            if(dataNumber<0){
                var n = await dataNumber*(-1);
                return n;
            }
            return dataNumber;
        }
        catch(e){
            console.log('Error al convertir un numero a positivo');
            return dataNumber;
        }
    }
}

module.exports = VerificarNumerosPositivos;