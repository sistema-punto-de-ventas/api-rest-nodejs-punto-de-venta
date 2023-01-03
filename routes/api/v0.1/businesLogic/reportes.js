const xlsx = require('xlsx');
const fs = require('fs')

const SchemaProducts = require('../../../../database/collection/models/producto');
const estadoFinanciero = require('../../../../database/collection/models/estadoFinanciero');
const { pvendido } = require('../../../../database/collection/models/venta');

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
                    Descripcion: listProducts[i]?.description,
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
                linkFile: `http://localhost:4000/reports/${name}.xlsx`,
                // linkFile: `https://api-puntodeventas.herokuapp.com/reports/${name}.xlsx`,
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

    static async listaDeEstadosFinancieros(req, res){
        let listEstadosFinancieros  = await estadoFinanciero.estadoFinanciero.find({}).populate(['listGastos', 'listVentas']);
        var listaEstad = [];

        for(var i=0; i<listEstadosFinancieros.length; i++){
            // console.log(i+" "+listEstadosFinancieros[i].idNegocio);
            var cierreCaja = {
                fecha:await listEstadosFinancieros[i].dateCreated,
                cierreC:await listEstadosFinancieros[i].cierreDeCaja.fechaCierre,
                estado:await  listEstadosFinancieros[i].state
            }
            listaEstad.push(cierreCaja)
            if(listEstadosFinancieros[i].listVentas.length>0){
                for(let a=0;a < listEstadosFinancieros[i].listVentas.length; a++){
                   
                    var venta = {
                        N_venta: await listEstadosFinancieros[i].listVentas[a].venta,
                        producto:await listEstadosFinancieros[i].listVentas[a].dateCreate,
                        producto: await listEstadosFinancieros[i].listVentas[a].nameProduct
                    }
                    // console.log(listEstadosFinancieros[i].listVentas[a].dateCreate)
                    // console.log(listEstadosFinancieros[i].listVentas[a])
                    await listaEstad.push(venta)

                    for( var a1=0;a1<listEstadosFinancieros[i].listVentas[a].products.length;a1++){
                        var listPvendidoss= await pvendido.find({_id:listEstadosFinancieros[i].listVentas[a].products[a1]});
                        // console.log(listPvendidoss)
                        for(var b1=0;b1<listPvendidoss.length;b1++){
                            var ListP = {
                                NombreProducto: await listPvendidoss[b1].nameProduct,
                                fechaVenta:listPvendidoss[b1].fechaRegistro
                            }
                            await listaEstad.push(ListP)
                        }
                    }
                }
            }
        }

        // console.log(listEstadosFinancieros);
                
        var newWB = await xlsx.utils.book_new();
        var newWS = await xlsx.utils.json_to_sheet(listaEstad);
        xlsx.utils.book_append_sheet(newWB, newWS, "Productos")
        

        var dir ='./public/reports';

        if(!fs.existsSync(dir)){
            fs.mkdirSync(dir)
        }

        var name = "REPORTESESTADOSFI_"+Date.now()
        var create = await xlsx.writeFile(newWB, `./public/reports/${name}.xlsx`)
        var linkFile={
            reports:'NotasStudents',
            linkFile: `http://localhost:4000/reports/${name}.xlsx`,
            // linkFile: `https://api-puntodeventas.herokuapp.com/reports/${name}.xlsx`,
        }
        res.status(200).send(linkFile)
    }
}

module.exports = Reporte;