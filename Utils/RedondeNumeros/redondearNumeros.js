class Redondear{
    static async redondearMonto(monto){
        
        try{
            let precioRedondeado = await Math.round((monto + Number.EPSILON)*100)/100;
            return precioRedondeado;
        }
        catch(error){
            console.log(`error al redondear el monto en la funcion redondearPrecio ${monto}`);
            return monto;
        }
    }
}

module.exports = Redondear;