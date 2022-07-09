'use strict'

class Redonde {

    static async  redondearPrecio(monto) {
        try{
            // let precioRedondeado =  Math.round(monto*100)/100;
            // return precioRedondeado;
            // let precioredondeado = await math.format(math.evaluate(monto),{notation:'fixed', precision:2});
            // return precioredondeado;
            let precioRedondeado = await math.round(monto,2);
            return precioRedondeado;
        }
        catch(error){
            console.log(`error al redondear el monto en la funcion redondearPrecio ${monto}`);
            return monto;
        }
    }
}

module.exports = Redonde;