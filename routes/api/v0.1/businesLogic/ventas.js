'use strict';

const VentaSchema = require('../../../../database/collection/models/venta');
const { verificacionCamposRequeridos } = require('../../../../Utils/verifyCampos/verifyCampos');
const { verifyListProducts, comprovacionDeProductosInDB, createVenta, validateUser, validateCliente } = require('./utilsVentas/utils');
const { user } = require('../../../../database/collection/models/user')
const { cliente } = require('../../../../database/collection/models/clientes');
const { negocio } = require('../../../../database/collection/models/negocio');
const { gastosUser } = require('../../../../database/collection/models/gastosUser');
const { estadoFinanciero } = require('../../../../database/collection/models/estadoFinanciero');
const { tipoGastos } = require('../../../../database/collection/models/tipoGasto')
const SchemaVenta = require('../../../../database/collection/models/venta');
const moment = require('moment');
const Verify = require('../../../../Utils/verifyCampos/verifyCampos');
const socketControllers = require('../../../../socket/controllers/socketControllers');
const { default: CallTickets } = require('./callTickets');
const Redondear = require('../../../../Utils/RedondeNumeros/redondearNumeros');


class Ventas {

    static async addNewVenta(req, res, next) {

        console.log('%c addNewVenta', 'color: red; font-weight: bold;', req.body);

        const { idCliente, products, precioTotal, nombreCliente, pagoCliente, cambioCliente } = await req.body;
        const { idUser, idNegocio } = req.params;
        

        console.log('---------------hhhh--------------------');
        console.log(products);
        // if(descuento == undefined || descuento == null || descuento <0){
        //     return res.status(300).send({status: 'No fount', error: "venta no procesada", message: "el campo descuento es requirerido" });
        // }

        if (!nombreCliente && !idCliente) return res.status(206).json({ status: 'No fount', message: "Error es requerido id cliente o nombre cliente" })

        if (products.length === 0 || products === undefined || products === null) return res.status(206).send({ status: 'No fount', message: "No se ha enviado ningun producto" });
        var verifyCamposReq = await verificacionCamposRequeridos([idNegocio, precioTotal, pagoCliente, cambioCliente]);

        if (!verifyCamposReq) return res.status(206).send({ status: 'No fount', error: "venta no procesada", message: "Complete los campos requiridos" });

        let cliente = '';
        const verifyUser = await validateUser(idUser);
        if (verifyUser.status == 'No fount') return res.status(206).json(verifyUser);

        if (idCliente) {
            const verifyCliente = await validateCliente(idCliente);
            if (verifyCliente.status == 'No fount') return res.status(206).json(verifyCliente);
            cliente = idCliente;
        } else {
            cliente = nombreCliente
        }
        if (pagoCliente < precioTotal) {
            return res.status(206).json({ status: 'No fount', message: 'El pago del cliente es menor al cambio' })
        }


        var stateVerify = await verifyListProducts(products);
        if (stateVerify.status === 'No fount') return res.status(206).send({ status: 'No fount', error: "venta no procesada", message: stateVerify });

        var stateExistProducts = await comprovacionDeProductosInDB(res, products);

        if (!stateExistProducts) return res.status(206).send({ status: 'No fount', error: "venta no procesada", message: "el id de uno de los productos es incorrecto" });

        createVenta(res, products, idNegocio, precioTotal, cliente, idUser, pagoCliente, cambioCliente);
    }



    static async getVentas(req, res, next) {
        try {
            const { idNegocio } = req.body;
            const ventas = await VentaSchema.Venta.find({ idNegocio });
            res.status(200).send({ status: "ok", message: "lista de ventas", result: ventas });
        }
        catch (err) {
            console.log('error en utilsVentas', err);
            res.status(400).send({ status: 'No fount', error: "error en el servidor", err });
        }
    }

    //listando ventas del usuario del dia
    static async getListVentasUser(req, res) {
        try {
            const { idNegocio, idUser } = req.params;

            const now = new Date();
            const dia = now.toString().split(' ')[0];
            const mes = now.toString().split(' ')[1];
            const num = now.toString().split(' ')[2];
            const anio = now.toString().split(' ')[3];

            const userName =    await getNameUser(idUser);
            if (userName.status == 'No fount') return res.status(404).json({
                status: 'No fount', message: 'Ese usuario no existe'
            });
            const ventas = await VentaSchema.Venta.find({ idNegocio, idUser }, {
                _id: 1,
                idUser: 1,
                idCLiente: 1,
                venta: 1,
                precioTotal: 1,
                pagoCliente: 1,
                cambioCliente: 1,
                products: 1,
                state: 1,
                dateCreate: 1
            }).populate('products');
            const filter = await ventas.filter((data) => {
                return data.dateCreate?.toString().includes(`${dia} ${mes} ${num} ${anio}`)
            })
            let arr = [], err = false, total = 0, sumEfectivoTotal = 0, sumCambio = 0;
            for (let i = 0; i < filter.length; i++) {
                total = await Redondear.redondearMonto(filter[i].precioTotal + total);
                sumEfectivoTotal =await  Redondear.redondearMonto((filter[i].pagoCliente * 1) + sumEfectivoTotal);
                sumCambio = await Redondear.redondearMonto((filter[i].cambioCliente * 1) + sumCambio);

                const user = await getNameUser(filter[i].idUser);
                if (user.status == 'No fount') return err = true;

                const cliente = await getNameCliente(filter[i].idCLiente);
                if (cliente.status == 'No fount') return err = true
                arr.push({
                    _id: filter[i]._id,
                    idUser: `${user.resp.name} ${user.resp.lastName}`,
                    idCLiente: cliente.status == 'No' ? filter[i].idCLiente : `${cliente.resp.name} ${cliente.resp.lastName}`,
                    venta: filter[i].venta,
                    precioTotal: filter[i].precioTotal,
                    pagoCliente: filter[i].pagoCliente,
                    cambioCliente: filter[i].cambioCliente,
                    products: filter[i].products,
                    state: filter[i].state,
                    dateCreate: filter[i].dateCreate,
                    hora: filter[i].dateCreate?.toString().split(' ')[4],
                })
            }
            if (err == true) return res.status(206).json({ status: 'No fount', message: 'Error al mostrar los datos' });


            return res.status(200).send({
                status: "ok",
                message: `Lista de ventas de ${userName.resp.name} ${userName.resp.lastName}`,
                sumTotal: total,
                sumEfectivoTotal,
                sumCambio,
                fecha: `${dia} ${mes} ${num} ${anio}`,
                cantidadVentas: arr.length,
                result: arr
            });
        }
        catch (err) {
            console.log('error en utilsVentas', err);
            return res.status(400).send({ status: 'No fount', error: "error en el servidor", err });
        }
    }

    // solo para test - muestra las fechas de las ventas
    static async showListVentas(req, res) {
        try {
            const { idNegocio } = req.params;
            const ventas = await VentaSchema.Venta.find({ idNegocio });
            var newData = await ventas.map(data => {
                return {
                    _id: data._id,
                    dateCreate: data.dateCreate,
                    dataCreate2: `${new Date(data.dateCreate).toLocaleDateString()} ${data.dateCreate.toLocaleTimeString()}`
                }
            })
            res.status(200).send({ status: "ok", message: "lista de ventas", result: newData });
        }
        catch (err) {
            console.log('error en utilsVentas', err);
            res.status(400).send({ status: 'No fount', error: "error en el servidor", err });
        }
    }

    //lista de todas las ventas por rangos
    static async getListVentasRange(req, res) {
        const { idNegocio, fechaInicio, fechaFinal } = req.params;
        //console.log(new Date(`${fechaInicio.replace(/-/g, '/')} 00:00:00`), new Date(`${fechaFinal.replace(/-/g, '/')} 00:02:58`));

        try {
            const ventas = await VentaSchema.Venta.find({
                idNegocio, $and: [
                    // { dateCreate: { $gte: new Date(`${fechaInicio}T00:00:14.000Z`) } },
                    // { dateCreate: { $lte: new Date(`${fechaFinal}T23:59:59.999Z`) } }

                    { dateCreate: { $gte: new Date(`${fechaInicio.replace(/-/g, '/')} 00:00:00`) } },
                    { dateCreate: { $lte: new Date(`${fechaFinal.replace(/-/g, '/')} 23:59:59`) } }
                ]
            }, {
                _id: 1,
                idUser: 1,
                idCLiente: 1,
                venta: 1,
                precioTotal: 1,
                pagoCliente: 1,
                cambioCliente: 1,
                products: 1,
                state: 1,
                dateCreate: 1
            }).populate('products');

            let arr = [], err = false, total = 0, sumEfectivoTotal = 0, sumCambio = 0;
            for (let i = 0; i < ventas.length; i++) {
                total = await Redondear.redondearMonto(ventas[i].precioTotal + total);
                sumEfectivoTotal =await Redondear.redondearMonto((ventas[i].pagoCliente * 1) + sumEfectivoTotal);
                sumCambio =await  Redondear.redondearMonto((ventas[i].cambioCliente * 1) + sumCambio);

                const user = await getNameUser(ventas[i].idUser);
                if (user.status == 'No fount') return err = true;

                const cliente = await getNameCliente(ventas[i].idCLiente);
                if (cliente.status == 'No fount') return err = true
                arr.push({
                    _id: ventas[i]._id,
                    idUser: `${user.resp.name} ${user.resp.lastName}`,
                    idCLiente: cliente.status == 'No' ? ventas[i].idCLiente : `${cliente.resp.name} ${cliente.resp.lastName}`,
                    venta: ventas[i].venta,
                    precioTotal: ventas[i].precioTotal,
                    pagoCliente: ventas[i].pagoCliente,
                    cambioCliente: ventas[i].cambioCliente,
                    products: ventas[i].products,
                    state: ventas[i].state,
                    dateCreate: ventas[i].dateCreate,
                    hora: ventas[i].dateCreate?.toString().split(' ')[4],
                })
            }
            if (err == true) return res.status(206).json({ status: "No fount", message: "No se puede mostrar los datos" })

            return res.status(200).json({
                status: 'ok',
                message: 'Rango de fechas',
                sumTotal: total,
                sumEfectivoTotal,
                sumCambio,
                cantidadVentas: ventas.length,
                result: arr
            })
        } catch (error) {
            console.log(error);
            return res.status(400).send({ status: 'No fount', error: "error en el servidor", err });
        }


    }

    static async reportGastosVentas(req, res) {
        const { idNegocio, fechaInicio, fechaFinal } = req.params;
        const { pgnV, pgsV, buscadorV, pgnG, pgsG, buscadorG,nameCategori } = req.body;
        const verifyNegocio = await validateNegocio(idNegocio);
        if (verifyNegocio.status == 'No fount') return res.status(206).json(verifyNegocio)
        var date1 = new Date(fechaInicio);
        var date2 = new Date(fechaFinal);

        if (date1 > date2) return res.status(206).json({
            status: 'No fount',
            message: 'rango de fenchas incorecto la fecha de inicio tiene que ser menor a la fecha final'
        })

        const getVentaNegocio = await getVentasRange({ idNegocio, fechaInicio, fechaFinal });
        const getGastosNegocio = await getGastosRange({ idNegocio, fechaInicio, fechaFinal });
        

        if (getVentaNegocio.status == 'No fount') return res.status(206).json(getVentaNegocio);
        if (getGastosNegocio.status == 'No fount') return res.status(206).json(getGastosNegocio);

        const montoInicial = await getDataEstadoFinanciero(idNegocio, fechaInicio, fechaFinal);
        if (montoInicial.status == 'No fount') return res.status(206).json(montoInicial);

        const paginationVentas = await paginationListVentas({ arrVentas: getVentaNegocio.product, pagenumber: pgnV, pagesize: pgsV, buscador: buscadorV });
        const paginationGastos = await paginationListGastos({ arrGastos: getGastosNegocio.gastos, pagenumber: pgnG, pagesize: pgsG, buscador: buscadorG });

        const productCategory = await getCategoriProduct(getVentaNegocio.product,nameCategori);

       
        return res.status(200).json({
            status: 'ok',
            message: 'Reporte de ventas y gastos',
            Fecha: `del ${fechaInicio} hasta ${fechaFinal}`,
            montoInicial: await Redondear.redondearMonto(montoInicial.montoInicial),
            totalVentas: await Redondear.redondearMonto(getVentaNegocio.totalVentas),
            gasatoTotal: await Redondear.redondearMonto(getGastosNegocio.totalGastos),
            total: await Redondear.redondearMonto((getVentaNegocio.totalVentas - getGastosNegocio.totalGastos) + montoInicial.montoInicial),
            cantidadVendido: getVentaNegocio.cantidadVendido,
            gastosLength: getGastosNegocio.gastosLength,
            productVendido: paginationVentas,
            gastosRealizados: paginationGastos,
            productCategory
        })
    }


    
    static async getStateVentas(req, res, next){

       try{
            var {stateOrdenRestaurante} = req.params;
            var verify = await Verify.verificacionCamposRequeridos([stateOrdenRestaurante]);
            if(!verify) return res.status(206).json({status:'No fount',message:'complete los campos requeridos'});


            const estasdoFinanciero = await estadoFinanciero.findOne({state:true}).populate(['listVentas']);
            
            const listVentas =await estasdoFinanciero.listVentas;
            

            if(stateOrdenRestaurante==='todo'){
                // var listVentasDetail = SchemaVenta.Venta.fin
                var listVentasDetail = new Array();
                for(var i =0; i<listVentas.length;i++){
                    // if(listVentas[i].stateOrdenRestaurante===stateOrdenRestaurante){
                        var dataVenta =await listProductosPortVentas(listVentas[i]._id);
                        listVentasDetail.push(dataVenta);
                    // }
                }
                var lengthList = listVentasDetail.length;
                return  res.status(200).send({"status":"ok","message":"lista de ventas", "tolalResults":lengthList,"result":listVentasDetail});
            }
            if(stateOrdenRestaurante==='espera-proceso'){
                var listVentasDetail=new Array();
                    for(var i =0; i<listVentas.length;i++){
                        if(listVentas[i].stateOrdenRestaurante==='proceso' || listVentas[i].stateOrdenRestaurante==='espera'){
                            var dataVenta =await listProductosPortVentas(listVentas[i]._id);
                            listVentasDetail.push(dataVenta);
                        }
                     }
                 
                var lengthList = listVentasDetail.length;
                return  res.status(200).send({"status":"ok","message":"lista de ventas, en espera y en proceso", "tolalResults":lengthList,"result":listVentasDetail});
            }
            if(stateOrdenRestaurante==='espera' || stateOrdenRestaurante === 'proceso' || stateOrdenRestaurante ==='enviado'){
                    // const listaVentasPendientes = await listVentas.filter((listVentas) => listVentas.stateOrdenRestaurante === stateOrdenRestaurante);
                    var listVentasDetail = new Array();
                    for(var i =0; i<listVentas.length;i++){
                        if(listVentas[i].stateOrdenRestaurante===stateOrdenRestaurante){
                            var dataVenta =await listProductosPortVentas(listVentas[i]._id);
                            listVentasDetail.push(dataVenta);
                        }
                    }
                    var lengthList = listVentasDetail.length;
                 
                    return res.status(200).send({"status":"ok","message":"lista de ventas", "tolalResults":lengthList,"result":listVentasDetail});
            }else{

                return res.status(200).json({status:'No fount',message:'Parametro de la peticion no valido'});
            }
            
       }
       catch(error){
                console.log("error en la consulta, stateOrdenRestaurante\n",error);
                return res.status(400).send({status:'No fount',error:"error en el servidor",err:error});
       }
    }

    static async getListProductsVentas(req, res, next){
        var {idVenta} = req.params;
        var veryfi = await Verify.verificacionCamposRequeridos([idVenta]);
        if(!veryfi)return res.status(206).send({status:'No fount',message:'complete los campos requeridos'});

        const listVentas = await SchemaVenta.Venta.findOne({_id:idVenta}).populate(['products']);
        if(!listVentas)return res.status(206).send({status:'No fount',message:'No se encontro la venta'});

        var lengthListProducts =await  listVentas.products.length;
        return res.status(200).send({status:'ok',message:'lista de productos de la venta', totalResults:listVentas.length,totalResultsProducts:lengthListProducts,result:listVentas});
    }

    static async setStateOrdenRestaurante(req, res){
        const { idVenta, idNegocio,  stateOrdenRestaurante } = req.body.data;
        console.log(req.body.data)

        try{
            
            var verify = await Verify.verificacionCamposRequeridos([idVenta,idNegocio,stateOrdenRestaurante]);
            if(!verify)return res.status(206).send({status:'No fount',message:'complete los campos requeridos'});
            if(stateOrdenRestaurante==="espera" || stateOrdenRestaurante==="proceso" || stateOrdenRestaurante==="enviado"){
                var queryVenta = await VentaSchema.Venta.find({_id:idVenta, idNegocio:idNegocio},{stateOrdenRestaurante});
                if(queryVenta.length===0)return res.status(206).send({status:'No fount',message:'No se encontro la venta'});
                var resultVenta = await VentaSchema.Venta.findByIdAndUpdate({_id:idVenta, idNegocio:idNegocio},{stateOrdenRestaurante});

                var resultVentaUpdate = await VentaSchema.Venta.find({_id:idVenta, idNegocio:idNegocio});
                var totalResults = resultVentaUpdate.length;
                
                // SOCKETS----
               
                socketControllers('[ventas] changeStateTickets',resultVentaUpdate);
               
                // ---SOCKETS---
                return res.status(200).send({status:'ok',message:'stateOrdenRestaurante de la venta actualizado', totalResults:totalResults, result:resultVentaUpdate});

            }else{
                return res.status(200).json({status:'No fount',message:'Parametro de la peticion no valido'});
            }
        }
        catch(error){
            console.log("error en la actalizacion, setStateOrdenRestaurante\n",error);
            res.status(400).send({status:'No fount',error:"error en el servidor :",err:error});
        }
      
    }

   

    static async getNumeroTicket(req, res){

        try{
            var {idNegocio} = req.params;
            var veryfi = await Verify.verificacionCamposRequeridos([idNegocio]);
            if(!veryfi)return res.status(206).send({status:'No fount',message:'complete los campos requeridos', err:"idNegocio requerido"});
            var dataNegocio = await negocio.findById({_id:idNegocio});
            var listVentas= await SchemaVenta.Venta.find({idNegocio});

            var ultimoTicketEmitido = listVentas.length;
            var numeroTicketActual = listVentas.length+1;
            var dataResponse = {
                nombreNegocio: dataNegocio.nombre,
                idNegocio:dataNegocio._id,
                ultimoTicketEmitido:ultimoTicketEmitido,
                numeroTicketActual:numeroTicketActual,
            }
            
            return res.status(200).send({status:'ok',message:'numero de ticket', result:dataResponse});
        }catch(err){
            return res.status(400).send({status:'No fount',error:"error en el servidor, no se puede obtner el número de ticket",err:err});
        }
    }

}





const listProductosPortVentas = async (idVentas) => {
    console.log(idVentas)
    var dataVenta = await VentaSchema.Venta.findById({_id:idVentas}).populate(['products']);
    // console.log(dataVenta)
    return dataVenta;
}





var getDaysArray = function (start, end) {
    for (var arr = [], dt = new Date(start); dt <= end; dt.setDate(dt.getDate() + 1)) {
        arr.push(new Date(dt));
    }
    return arr;
};
//sacar las ventas en cualquier rangos
async function getVentasRange({ idNegocio, fechaInicio, fechaFinal }) {
    try {
        const ventasRange = await VentaSchema.Venta.find({
            idNegocio, $and: [
                { dateCreate: { $gte: new Date(`${fechaInicio.replace(/-/g, '/')} 00:00:00`) } },
                { dateCreate: { $lte: new Date(`${fechaFinal.replace(/-/g, '/')} 23:59:59`) } }
            ]
        }).populate('products');

        /* const daylist = getDaysArray(new Date(`${fechaInicio}T04:00:00.000Z`), new Date(`${fechaFinal}T04:00:00.000Z`));
        daylist.map((v) => v.toISOString().slice(0, 10)).join("");        

        let arrPrueba = []
        for (var i = 0; i < ventasRange.length; i++) {

            for (var j = 0; j < daylist.length; j++) {
                let d = new Date(ventasRange[i].dateCreate)
                
                if (d.toDateString() == daylist[j].toDateString()) {
                    arrPrueba.push(ventasRange[i])
                }
            }

        } */
        //console.log(ventasRange.length, ' ================================================================= arrPrueba rrr')

        let arrVentas = [], err = false; let totalVentas = 0, sumEfectivoCLiente = 0, sumCambio = 0;
        for (let i = 0; i < ventasRange.length; i++) {
            totalVentas = ventasRange[i].precioTotal + totalVentas;
            sumEfectivoCLiente = ventasRange[i].pagoCliente + sumEfectivoCLiente;
            sumCambio = ventasRange[i].cambioCliente + sumCambio;

            const user = await getNameUser(ventasRange[i].idUser);
            if (user.status == 'No fount') return err = true;
            const cliente = await getNameCliente(ventasRange[i].idCLiente);
            if (cliente.status == 'No fount') return err = true

            const dateLocal = await converterDate(ventasRange[i].dateCreate);
            if (dateLocal.status === 'No fount') return res.status(206).json(dateLocal);
            arrVentas.push({
                _id: ventasRange[i]._id,
                idUser: `${user.resp.name} ${user.resp.lastName}`,
                idCLiente: cliente.status == 'No' ? ventasRange[i].idCLiente : `${cliente.resp.name} ${cliente.resp.lastName}`,
                venta: ventasRange[i].venta,
                precioTotal: ventasRange[i].precioTotal,
                pagoCliente: ventasRange[i].pagoCliente,
                cambioCliente: ventasRange[i].cambioCliente,
                products: ventasRange[i].products,
                state: ventasRange[i].state,
                dateCreate: dateLocal.result?.dateLocal,
                hora: ventasRange[i].dateCreate?.toString().split(' ')[4],
            })

        }
        if (err) return { status: 'No fount', message: 'No se puede mostra los datos' }
        return {
            status: 'ok',
            message: 'Ventas',
            totalVentas,
            cantidadVendido: ventasRange.length,
            sumEfectivoCLiente,
            sumCambio,
            product: arrVentas
        }

    } catch (error) {
        console.log(error);
        return { status: 'No fount', message: 'error 400', error }
    }
}
//lista de gastos por rango 
async function getGastosRange({ idNegocio, fechaInicio, fechaFinal }) {
    try {
        const gastosRange = await gastosUser.find({
            idNegocio, $and: [
                { dateCreate: { $gte: new Date(`${fechaInicio.replace(/-/g, '/')} 00:00:00`) } },
                { dateCreate: { $lte: new Date(`${fechaFinal.replace(/-/g, '/')} 23:59:59`) } }
            ]
        });
        /* //lista de rangos para verificar
        const daylist = getDaysArray(new Date(`${fechaInicio}T04:00:00.000Z`), new Date(`${fechaFinal}T04:00:00.000Z`));
        daylist.map((v) => v.toISOString().slice(0, 10)).join("");  

        console.log(daylist, ' ================================================================= daylist',gastosRange);
        //filtramos por rango por fecha local
        let arrPrueba = []
        for (var i = 0; i < gastosRange.length; i++) {

            for (var j = 0; j < daylist.length; j++) {
                let d = new Date(gastosRange[i].dateCreate)
                console.log(d.toDateString(), '==', daylist[j].toDateString())
                if (d.toDateString() == daylist[j].toDateString()) {
                    arrPrueba.push(gastosRange[i])
                }
            }

        } */

        let totalGastos = 0;
        let arr = [];
        for (let i = 0; i < gastosRange.length; i++) {
            totalGastos = gastosRange[i].montoGasto + totalGastos;

            const user = await getNameUser(gastosRange[i].idUser);
            if (user.status == 'No fount') return res.status(206).json(user)
            let nameR = ''
            if (gastosRange[i].responsableUpdate != 'none') {
                const responsable = await getNameUser(gastosRange[i].responsableUpdate);
                if (responsable.status == 'No fount') return res.status(206).json(responsable)
                nameR = `${responsable.resp.name} ${responsable.resp.lastName}`
            }

            const nameTipoGasto = await validateIdTipoGasto(gastosRange[i].idTipoGastos)
            if (nameTipoGasto.status == 'No fount') return res.status(206).json(nameTipoGasto)

            const dateLocal = await converterDate(gastosRange[i].dateCreate);
            const dateUpdateLocal = await converterDate(gastosRange[i].updateDate)
            if (dateLocal.status === 'No fount') return res.status(206).json(dateLocal);
            if (dateUpdateLocal.status === 'No fount') return res.status(206).json(dateUpdateLocal);

            arr.push({
                _id: gastosRange[i]._id,
                idTipoGastos: nameTipoGasto.resp.name,
                description: gastosRange[i].description,
                idUser: `${user.resp.name} ${user.resp.lastName}`,
                montoGasto: gastosRange[i].montoGasto,
                isUpdate: gastosRange[i].isUpdate,
                responsableUpdate: nameR,
                montoAsignadoA: gastosRange[i].montoAsignadoA,
                dateCreate: dateLocal.result?.dateLocal,
                hora: gastosRange[i].dateCreate?.toString().split(' ')[4],
                updateDate: dateUpdateLocal.result?.dateLocal,
                horaUpdate: gastosRange[i].updateDate?.toString().split(' ')[4],

            })
        }
        return {
            status: 'ok',
            message: 'gastos',
            totalGastos,
            gastosLength: gastosRange.length,
            gastos: arr

        }

    } catch (error) {
        console.log(error);
        return { status: 'No fount', message: 'error 400', error }
    }
}
//sacar monto inicial de estado financiero
async function getDataEstadoFinanciero(idNegocio, fechaInicio, fechaFinal) {
    try {
        const resp = await estadoFinanciero.find({
            idNegocio, $and: [
                { dateCreated: { $gte: new Date(`${fechaInicio.replace(/-/g, '/')} 00:00:00`) } },
                { dateCreated: { $lte: new Date(`${fechaFinal.replace(/-/g, '/')} 23:59:59`) } }
            ]
        });
        let sumMontoInicial = 0;
        for (var i = 0; i < resp.length; i++) {
            sumMontoInicial = resp[i].montoInicial + sumMontoInicial;
        }
        return { status: 'ok', message: 'continuar', montoInicial: sumMontoInicial }

    } catch (error) {
        console.log(error);
        return { status: 'No fount', message: 'error 400', error }
    }
}
async function getNameUser(idUSer) {
    try {
        const resp = await user.findOne({ _id: idUSer })

        if (!resp) return { status: 'No fount', message: 'Ese usuario no existe' }
        return { status: 'ok', message: 'usuario si existe', resp }
    } catch (error) {
        console.log(error);
        return { status: 'No fount', message: 'Ese usuario no existe' }
    }
}
async function getNameCliente(idCliente) {
    try {
        const resp = await cliente.findOne({ _id: idCliente })
        if (!resp) return { status: 'No fount', message: 'Cliente No existe' }
        return { status: 'ok', message: 'existe', resp }
    } catch (error) {
        return { status: 'No', message: 'Publico general' }
    }
}

//validacion del negocioF
async function validateNegocio(idNegocio) {
    try {
        const resp = await negocio.findById({ _id: idNegocio });
        if (!resp) return { status: 'No fount', message: 'NO existe ese negocio' };
        return { status: 'ok', message: 'Existe', result: resp }
    } catch (error) {
        console.log(error);
        return { status: 'No fount', message: 'Error 400', error }
    }
}
async function validateIdTipoGasto(idTIpoGasto) {
    try {
        const resp = await tipoGastos.findOne({ _id: idTIpoGasto });
        if (!resp) return { status: 'No fount', message: 'No se puede mostrar por que ese tipo de gastos no fue registrado' }
        return { status: 'ok', message: 'existe', resp }
    } catch (error) {
        console.error(error);
        return { status: 'No fount', message: 'erro 400' }
    }
}

async function converterDate(date) {
    try {
        let dateLocal = new Date(date).toLocaleString().split(' ')[0]
        let timeLocal = new Date(date).toLocaleString().split(' ')[1]
        return {
            status: 'ok',
            result: {
                dateLocal,
                timeLocal
            }
        }
    } catch (error) {
        console.log(error);
        return { status: 'No fount', message: 'Error al canvertir las fechas a la hora local' }
    }
}

//paginas y busqueda de datos de list ventas del estado financiero
async function paginationListVentas({ arrVentas = [], pagenumber = 0, pagesize = 4, buscador = '' }) {
    //console.log(arrVentas, ' 0---0-0000---')
    const filtrar = arrVentas.filter((item) => {
        return item.idUser.toLowerCase().includes(buscador.toLowerCase()) ||
            item.idCLiente.toLowerCase().includes(buscador.toLowerCase()) ||
            item.hora.toLowerCase().includes(buscador.toLowerCase())
    })
    var pageNumber = (pagenumber * 1) || 0;//numero de pagina
    var pageSize = (pagesize * 1) || 4;//tamanio de pagiancion
    var pageCount = Math.ceil(filtrar.length / pageSize);
    let pag = filtrar.slice(pageNumber * pageSize, (pageNumber + 1) * pageSize);
    return { result: pag, pageCount, pageNumber }

}
//paginas y busqueda de datos de list gastos del estado financiero
async function paginationListGastos({ arrGastos = [], pagenumber = 0, pagesize = 4, buscador = '' }) {
    const filtrar = arrGastos.filter((item) => {
        return item.idUser.toLowerCase().includes(buscador.toLowerCase()) ||
            item.hora.toLowerCase().includes(buscador.toLowerCase()) ||
            item.montoAsignadoA.toLowerCase().includes(buscador.toLowerCase()) ||
            item.idTipoGastos.toLowerCase().includes(buscador.toLowerCase())
    })
    var pageNumber = (pagenumber * 1) || 0;//numero de pagina
    var pageSize = (pagesize * 1) || 4;//tamanio de pagiancion
    var pageCount = Math.ceil(filtrar.length / pageSize);
    let pag = filtrar.slice(pageNumber * pageSize, (pageNumber + 1) * pageSize);
    return { result: pag, pageCount, pageNumber }

}

//get productos vendidos por categoria del rango de fechas que se selecciona
const getCategoriProduct = async (arrVentas= [],nameCategori = 'Sodas') => {    
    let arr = [];
    let sumTotal = 0;
    for (let i = 0; i < arrVentas.length; i++) {
        let pr = arrVentas[i].products
        for (let j = 0; j < pr.length; j++) {
            if (pr[j].category === nameCategori) {
                sumTotal = pr[j].total + sumTotal;
                arr.push({
                    id: pr[j]._id,
                    idProduct:pr[j].idProduct,
                    nameProduct: pr[j].nameProduct,
                    detalleVenta: pr[j].detalleVenta,
                    category: pr[j].category,
                    precioUnitario: pr[j].precioUnitario,                    
                    cantidad:0,
                    total: 0,
                });
            }

        }
    }
    let obj = {}
    for (let d = 0; d < arr.length; d++) {
      let product = obj[arr[d].idProduct];
      if (!product) {
        product = obj[arr[d].idProduct] = arr[d];
      }
      product.cantidad ++
      product.total = product.cantidad * product.precioUnitario
    }    
    let newArr = [];
    for (const id in obj) {
      newArr.push(obj[id]);
    }
    return {arrProductCategory:newArr,sumTotal}

}

module.exports = Ventas;