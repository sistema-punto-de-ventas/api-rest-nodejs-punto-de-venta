'use strict';

const SchemaProducts = require('../../../../database/collection/models/producto');
const SchemaNegocio = require('../../../../database/collection/models/negocio');
const { user } = require('../../../../database/collection/models/user');
const { redondearPrecio } = require('../../../../Utils/RedondeNumeros/redondeoPrecios')

const { verificacionCamposRequeridos } = require('../../../../Utils/verifyCampos/verifyCampos');
const Verify = require('../../../../Utils/verifyCampos/verifyCampos');
const res = require('express/lib/response');
const ManejoDesString = require('../../../../Utils/manejoDeString/manejoDeString');
const VerificarNumerosPositivos = require('../../../../Utils/actulizarLosDatosAPositivos/verificarNumeroPositivo');


class Products {

    static async addNewProduct(req, res, next) {

        try {

            const { nameTienda, nameProduct, category, subcategory, precioUnitario, precioCosto,
                unidadesDisponibles, codigoProducto, colorsAvailable, estadoProduct, tipoEnvio, envioDesde, costoEnvio,
                marcaProduct, description
            } = req.body;
            const { idNegocio, idUser } = req.params;
            const campos = await verificacionCamposRequeridos([idNegocio, idUser, nameProduct, category,
                subcategory, precioUnitario, precioCosto, unidadesDisponibles
            ]);

            if (!campos) {
                return res.status(206).send({ status: 'No fount', message: 'Faltan campos requeridos' });
            }

            const verifyUser = await user.findById({ _id: idUser })
            if (!verifyUser) return res.status(206).send({ status: 'No fount', message: 'Id negocio no existe' });

            const dataTienda = await SchemaNegocio.negocio.findById({ _id: idNegocio });
            const dataProduct = await SchemaProducts.producto.findOne({ nameProduct:nameProduct });
            var namePro = await ManejoDesString.toUperCaseFirstCharacter(nameProduct);
            const dataProduct2 = await SchemaProducts.producto.findOne({ nameProduct:namePro });

            if (!dataTienda) return res.status(206).send({ status: 'No fount', message: 'Id negocio no existe' })
            if (dataProduct || dataProduct2) return res.status(206).send({ status: 'No fount', message: 'El nombre del producto ya fue registrado' })

            var newProduct = new SchemaProducts.producto({

                idNegocio: idNegocio,
                idUser: idUser,
                nameTienda: dataTienda.nombre ? dataTienda.nombre : '',
                nameProduct: nameProduct ? await ManejoDesString.toUperCaseFirstCharacter(nameProduct) : '',
                category: category ? category : '',
                subcategory: subcategory ? subcategory : '',
                precioUnitario: precioUnitario ? precioUnitario : 0,
                precioCosto: precioCosto ? precioCosto: 0,
                unidadesDisponibles: unidadesDisponibles ? unidadesDisponibles : 0,
                codigoProducto: codigoProducto? codigoProducto : '',
                colorsAvailable: colorsAvailable ? colorsAvailable : 'color de la foto',
                envioDesde: dataTienda?.city ? dataTienda.city : 'No definido',
                tipoEnvio: tipoEnvio ? tipoEnvio : 'gratuito',
                costoEnvio: costoEnvio ? costoEnvio : 0,
                estadoProduct: estadoProduct ? estadoProduct : 'nuevo',
                marcaproduct: marcaProduct ? marcaProduct : '',
                description: description ? description : '',
                urlImages: [],
                // fechaRegistro :  Date.now

            })

            var newDataProduct = await newProduct.save();

            res.status(200).send({
                status: 'ok',
                message: 'Se registro un producto',
                result: newDataProduct
            })
        }
        catch (err) {
            console.log('error al crear el producto\n', err);
            res.status(500).send({ status: 'No fount', error: 'no creado', message: 'error al crear el producto' });
        }

    }

    static async updateProducto(req, res) {        
        const { nameProduct, codigoProducto, category, subcategory, precioUnitario, precioCosto, unidadesDisponibles, description } = req.body;
        const { idProducto } = req.params;

        const product = await SchemaProducts.producto.findById({ _id: idProducto });
        if (!product) return res.status(206).json({ status: 'No fount', message: 'Ese producto no existe' });
        const updateDatas = await {
            nameProduct:  await ManejoDesString.toUperCaseFirstCharacter(nameProduct) || product.nameProduct,
            codigoProducto: codigoProducto|| product.codigoProducto,
            category: category || product.category,
            subcategory: subcategory || product.subcategory,
            precioUnitario: await VerificarNumerosPositivos.verifyNumber(precioUnitario) || product.precioUnitario,
            precioCosto: await VerificarNumerosPositivos.verifyNumber(precioCosto) || product.precioCosto,
            unidadesDisponibles: await VerificarNumerosPositivos.verifyNumber(unidadesDisponibles) || product.unidadesDisponibles,
            description: description || product.description,
        }
        try {
            if (product.nameProduct == nameProduct) {
                await SchemaProducts.producto.findOneAndUpdate({ _id: idProducto }, updateDatas);
                const newProduct = await SchemaProducts.producto.findOne({ _id: idProducto });
                return res.status(200).send({
                    status: 'ok',
                    message: 'Se actulizo el producto',
                    result: newProduct
                });
            }
            const verifyName = await SchemaProducts.producto.findOne({ nameProduct });
            if (verifyName) {
                console.log('verifica si ese nombre existe')
                return res.status(206).json({
                    status: 'No fount',
                    message: 'No puedes actualizar con ese nombre porque ya esta registrado'
                })
            }
            await SchemaProducts.producto.findOneAndUpdate({ _id: idProducto }, updateDatas);
            const newProduct = await SchemaProducts.producto.findOne({ _id: idProducto });
            return res.status(200).send({
                status: 'ok',
                message: 'Se actulizo el producto',
                result: newProduct
            });
        } catch (error) {
            console.log(error);
            return res.status(400).json({ status: 'No fount', message: 'No se pudo actualizar los datos', error })
        }
    }


    // muestra la lista de todos los productos pertenecientes a un negocio
    static async getAllProducts(req, res, next) {
        const { idNegocio } = req.params;
        try {
            var dataProduct = await SchemaProducts.producto.find({ idNegocio });
            res.status(200).send({ status: 'ok', message: "Lista de productos disponibles y activos", result: dataProduct })
        }
        catch (err) {
            console.log('error al obtener los productos\n', err);
            res.status(500).send({ error: 'No fount', message: 'error al obtener los productos' });
        }
    }

    static async deleteProduct(req, res, next){

       try{
        const {ipProduct, state} = req.body;

        var verifyCampo = await Verify.verificacionCamposRequeridos([ipProduct, state]);
        if(!verifyCampo) return res.status(206).send({ status: 'No fount', message: 'Complete los campos requeidos'  });

        var result = await SchemaProducts.producto.findById({_id: ipProduct});
        if(!result) return res.status(206).send({status: 'No fount', message: 'El producto no existe'});
        // await SchemaProducts.producto.findByIdAndUpdate({_id: ipProduct},  {state});
        await SchemaProducts.producto.findOneAndDelete({_id: ipProduct});

        // var respuestaUpdate = await SchemaProducts.producto.findById({_id: ipProduct});
        res.status(200).send({status: 'ok', message: 'Producto eleminado correctamente', result: {id:result?._id, nameProduct:result?.nameProduct}});

       }
       catch(err){
        console.log('error al eliminar el producto\n', err);
        res.status(500).send({ status: 'No fount', error: 'no eliminado', message: 'error al eliminar el producto' });
       }

    }

    static async searchProducts(req, res, next){

        const { idNegocio, nameSearch } = req.params;
        const { order, pagination, namePCategoria, orderCategory } = req.body;  //oder pude ser "asc" o "desc"
        console.log(order)
        console.log(req.params)
        console.log(req.body)
        
        const LIMIT = 50;
        var skip = parseInt(pagination)>=1?(parseInt(pagination)-1)*50: 0;


         var stateVery = Verify.verificacionCamposRequeridos([idNegocio]);
         if(stateVery){

            // expresion regular para la busqueda
            var regex = new RegExp(`${nameSearch}`, 'gi');
            var resultSearh =[];
            if(nameSearch!=undefined){

                switch(order){
                    case 'asc':{
                        resultSearh = await SchemaProducts.producto.find({idNegocio:idNegocio, nameProduct: regex}).sort({ precioUnitario:1}).limit(LIMIT).skip(skip);
                        return res.status(200).send({status: 'ok', message: 'Lista de coincidencias', result: resultSearh});
                    }
                    case 'desc':{
                        resultSearh = await SchemaProducts.producto.find({idNegocio:idNegocio, nameProduct: regex}).sort({ precioUnitario:-1}).limit(LIMIT).skip(skip);
                        return res.status(200).send({status: 'ok', message: 'Lista de coincidencias', result: resultSearh});
                    }
                    case 'cantidadAsc':{
                        resultSearh = await SchemaProducts.producto.find({idNegocio:idNegocio, nameProduct: regex}).sort({ unidadesDisponibles:1}).limit(LIMIT).skip(skip);
                        return res.status(200).send({status: 'ok', message: 'Lista de coincidencias', result: resultSearh});
                    }
                    case 'cantidadDesc':{
                        resultSearh = await SchemaProducts.producto.find({idNegocio:idNegocio, nameProduct: regex}).sort({ unidadesDisponibles:-1}).limit(LIMIT).skip(skip);
                        return res.status(200).send({status: 'ok', message: 'Lista de coincidencias', result: resultSearh});
                    }
                    case 'categoriaAsc':{
                        resultSearh = await SchemaProducts.producto.find({idNegocio:idNegocio, category:order, nameProduct: regex}).sort({ precioCosto:-1}).limit(LIMIT).skip(skip);
                        return res.status(200).send({status: 'ok', message: 'Lista de coincidencias', result: resultSearh});
                    }
                    case 'categoriaDesc':{
                        resultSearh = await SchemaProducts.producto.find({idNegocio:idNegocio,category:order, nameProduct: regex}).sort({ precioCosto:-1}).limit(LIMIT).skip(skip);
                        return res.status(200).send({status: 'ok', message: 'Lista de coincidencias', result: resultSearh});
                    }
                    case 'categoriaOnlyName':{

                        if(orderCategory=='asc'){
                            resultSearh = await SchemaProducts.producto.find({idNegocio:idNegocio, category:namePCategoria, nameProduct: regex}).sort({ precioCosto:-1}).limit(LIMIT).skip(skip);
                            return res.status(200).send({status: 'ok', message: 'Lista de coincidencias', result: resultSearh});
                        }
                        if(orderCategory=='desc'){
                            resultSearh = await SchemaProducts.producto.find({idNegocio:idNegocio, category:namePCategoria, nameProduct: regex}).sort({ precioCosto:1}).limit(LIMIT).skip(skip);
                            return res.status(200).send({status: 'ok', message: 'Lista de coincidencias', result: resultSearh});
                        }
                        resultSearh = await SchemaProducts.producto.find({idNegocio:idNegocio, category:namePCategoria,  nameProduct: regex}).limit(LIMIT).skip(skip);
                        return res.status(200).send({status: 'ok', message: 'Lista de coincidencias', result: resultSearh});
                    }
                    case 'codigoProducto':{
                        if(orderCategory=='asc'){
                            resultSearh = await SchemaProducts.producto.find({idNegocio:idNegocio, category:namePCategoria, codigoProducto: regex}).sort({ precioCosto:-1}).limit(LIMIT).skip(skip);
                            return res.status(200).send({status: 'ok', message: 'Lista de coincidencias', result: resultSearh});
                        }
                        if(orderCategory=='desc'){
                            resultSearh = await SchemaProducts.producto.find({idNegocio:idNegocio, category:namePCategoria, codigoProducto: regex}).sort({ precioCosto:1}).limit(LIMIT).skip(skip);
                            return res.status(200).send({status: 'ok', message: 'Lista de coincidencias', result: resultSearh});
                        }
                        resultSearh = await SchemaProducts.producto.find({idNegocio:idNegocio,  codigoProducto: regex}).limit(LIMIT).skip(skip);
                        return res.status(200).send({status: 'ok', message: 'Lista de coincidencias', result: resultSearh});
                    }
                    default:{
                        resultSearh = await SchemaProducts.producto.find({idNegocio:idNegocio, nameProduct: regex}).limit(LIMIT).skip(skip);
                        return res.status(200).send({status: 'ok', message: 'Lista de coincidencias', result: resultSearh});
                    }
                }  
            }else{
                
                switch(order){
                    case 'asc':{
                        resultSearh = await SchemaProducts.producto.find({idNegocio:idNegocio}).sort({ precioUnitario:1}).limit(LIMIT).skip(skip);
                        return res.status(200).send({status: 'ok', message: 'Lista de coincidencias', result: resultSearh});
                    }
                    case 'desc':{
                        resultSearh = await SchemaProducts.producto.find({idNegocio:idNegocio}).sort({ precioUnitario:-1}).limit(LIMIT).skip(skip);
                        return res.status(200).send({status: 'ok', message: 'Lista de coincidencias', result: resultSearh});
                    }
                    case 'cantidadAsc':{
                        resultSearh = await SchemaProducts.producto.find({idNegocio:idNegocio}).sort({ unidadesDisponibles:1}).limit(LIMIT).skip(skip);
                        return res.status(200).send({status: 'ok', message: 'Lista de coincidencias', result: resultSearh});
                    }
                    case 'cantidadDesc':{
                        resultSearh = await SchemaProducts.producto.find({idNegocio:idNegocio}).sort({ unidadesDisponibles:-1}).limit(LIMIT).skip(skip);
                        return res.status(200).send({status: 'ok', message: 'Lista de coincidencias', result: resultSearh});
                    }
                    case 'categoriaAsc':{
                        resultSearh = await SchemaProducts.producto.find({idNegocio:idNegocio,category:order}).sort({ precioUnitario:-1}).limit(LIMIT).skip(skip);
                        return res.status(200).send({status: 'ok', message: 'Lista de coincidencias', result: resultSearh});
                    }
                    case 'categoriaDesc':{
                        resultSearh = await SchemaProducts.producto.find({idNegocio:idNegocio, category:order}).sort({ precioUnitario:-1}).limit(LIMIT).skip(skip);
                        return res.status(200).send({status: 'ok', message: 'Lista de coincidencias', result: resultSearh});
                    }
                    case 'categoriaOnlyName':{
                        if(orderCategory=='asc'){
                            resultSearh = await SchemaProducts.producto.find({idNegocio:idNegocio, category:namePCategoria}).sort({ precioUnitario:1}).limit(LIMIT).skip(skip);
                            return res.status(200).send({status: 'ok', message: 'Lista de coincidencias', result: resultSearh});
                        }
                        if(orderCategory=='desc'){
                            resultSearh = await SchemaProducts.producto.find({idNegocio:idNegocio, category:namePCategoria}).sort({ precioUnitario:-1}).limit(LIMIT).skip(skip);
                            return res.status(200).send({status: 'ok', message: 'Lista de coincidencias', result: resultSearh});
                        }
                        if(orderCategory=='cantidadAsc'){
                            resultSearh = await SchemaProducts.producto.find({idNegocio:idNegocio, category:namePCategoria}).sort({ unidadesDisponibles:1}).limit(LIMIT).skip(skip);
                            return res.status(200).send({status: 'ok', message: 'Lista de coincidencias', result: resultSearh});
                        }
                        if(orderCategory=='cantidadDesc'){
                            resultSearh = await SchemaProducts.producto.find({idNegocio:idNegocio, category:namePCategoria}).sort({ unidadesDisponibles:-1}).limit(LIMIT).skip(skip);
                            return res.status(200).send({status: 'ok', message: 'Lista de coincidencias', result: resultSearh});
                        }
                        resultSearh = await SchemaProducts.producto.find({idNegocio:idNegocio, category:namePCategoria}).limit(LIMIT).skip(skip);
                        return res.status(200).send({status: 'ok', message: 'Lista de coincidencias', result: resultSearh});
                    }
                    default:{
                        resultSearh = await SchemaProducts.producto.find({idNegocio:idNegocio}).limit(LIMIT).skip(skip);
                        return res.status(200).send({status: 'ok', message: 'Lista de coincidencias', result: resultSearh});
                    }
                }
            }


        }else{
            return res.status(206).send({status: 'No fount', message: 'Complete los campos requeidos', example:{idNegocio:"12332m23n423k"}});
        }

        // const resutls = await  SchemaProducts.producto.find({idNegocio:idNegocio}).sort({precioCosto:1});
        // return res.status(200).send({status: 'ok', message: 'Lista de coincidencias', result: resutls});
        
    }

}



module.exports = Products;