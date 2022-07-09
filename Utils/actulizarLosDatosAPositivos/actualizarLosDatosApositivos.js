const SchemaProducts = require('../../database/collection/models/producto');

// class ActualizarLosDatosAPositivo{

    // actualiza los datos a positivos
    async  function  updateData (){
        const dataProduc = await SchemaProducts.producto.find({state:true});
        for(let i=0; i<dataProduc.length;i++){
            if(dataProduc[i].precioUnitario<0){
                var precioUnitario = await dataProduc[i].precioUnitario*(-1)
                console.log(precioUnitario);
                await SchemaProducts.producto.findOneAndUpdate({_id:dataProduc[i]._id},{precioUnitario});
                console.log(dataProduc[i])
            }
            if(dataProduc[i].precioCosto<0){
                var precioCosto = await dataProduc[i].precioCosto*(-1)
                console.log(precioCosto);
                await SchemaProducts.producto.findOneAndUpdate({_id:dataProduc[i]._id},{precioCosto});
                console.log(dataProduc[i])
            }
            if(dataProduc[i].unidadesDisponibles<0){
                var unidadesDisponibles = await dataProduc[i].unidadesDisponibles*(-1)
                console.log(unidadesDisponibles);
                await SchemaProducts.producto.findOneAndUpdate({_id:dataProduc[i]._id},{unidadesDisponibles});
                console.log(dataProduc[i])
            }
        }
        // console.log(dataProduc);
    }
// }

module.exports = updateData;

// module.export = ActualizarLosDatosAPositivo.updateData();