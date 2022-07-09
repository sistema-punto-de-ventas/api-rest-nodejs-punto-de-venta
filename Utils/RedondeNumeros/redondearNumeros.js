
const {create, all} = require('mathjs')

const config={};
const math = create(all, config);

class Redondear{
    static async redondearMonto(monto){
        
        try{
            // let precioRedondeado = await Math.round((monto + Number.EPSILON)*100)/100;
            // return precioRedondeado;

            // let precioredondeado = await math.format(math.evaluate(monto),{notation:'fixed', precision:2});
            // let numberPrecio = await math.evaluate(`number(${precioredondeado})`)
            let precioRedondeado = await math.round(monto,2);
            return precioRedondeado;
        }
        catch(error){
            console.log(`error al redondear el monto en la funcion redondearPrecio: ${monto}`);
            return monto;
        }
    }
}

module.exports = Redondear;