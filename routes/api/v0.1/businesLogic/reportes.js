const xlsx = require('xlsx');
const fs = require('fs')

const SchemaProducts = require('../../../../database/collection/models/producto');

class Reporte{
    static async listarProductos(req, res){
        try{
            let listProducts = await SchemaProducts.producto.find({state:true});
            // console.log(listProducts);
            var listP=[];
            for(var i=0; i<listProducts.length;i++){
                var product={
                    Tienda: listProducts[i]?.nameTienda,
                    Producto: listProducts[i]?.nameProduct,
                    Categoria: listProducts[i]?.category,
                    Subcategoria: listProducts[i]?.subcategory,
                    Estado: listProducts[i]?.state==true?'Activo':'Inactivo',
                    Precio_Compra: listProducts[i]?.precioCosto,
                    Precio_Venta: listProducts[i]?.precioUnitario,
                    Unidades_Disponibles: listProducts[i]?.unidadesDisponibles,
                    Codigo: listProducts[i]?.codigoProducto,
                    Color: listProducts[i]?.colorsAvailable,
                    // Envios_Desde: listProducts[i].envioDesde,
                    // Tipo_Envio: listProducts[i].tipoEnvio,
                    // Costo_Envio: listProducts[i].costoEnvio,
                    Estado_Producto: listProducts[i]?.estadoProduct,
                    Marca: listProducts[i]?.marcaproduct,
                    Descipcion: listProducts[i]?.description,
                }
                listP.push(product)
            }
            
    
            
            var newWB = await xlsx.utils.book_new();
            var newWS = await xlsx.utils.json_to_sheet(listP);
            xlsx.utils.book_append_sheet(newWB, newWS, "Productos")
            
    
            var dir ='./public/reports';
    
            if(!fs.existsSync(dir)){
                fs.mkdirSync(dir)
            }
    
            var name = "PRODUCTOS_"+Date.now()
            var create = await xlsx.writeFile(newWB, `./public/reports/${name}.xlsx`)
            
            
    
            var linkFile={
                reports:'NotasStudents',
                linkFile: `https://api-puntodeventas.herokuapp.com/reports/${name}.xlsx`,
            }
            res.status(200).send(linkFile)
        }catch(e){
            var linkFile={
                reports:'Error al generar el xlsx',
                linkFile: ``,
            }
            res.status(200).send(linkFile)
        }
    }
    
}

module.exports = Reporte;