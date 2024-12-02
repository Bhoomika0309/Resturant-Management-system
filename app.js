const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const { MongoClient } = require('mongodb');
const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs');
const session = require('express-session');
const moment = require('moment');

const currentDate = moment().format('YYYY-MM-DD');
const parts = currentDate.split('-');
const formattedDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
const url = 'mongodb://localhost/RMS';
const client = new MongoClient(url, { useNewUrlParser: true, useUnifiedTopology: true });

const app = express();
app.set('view engine', 'ejs');
const port = 3100;
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'main.html'))
});


mongoose.connect('mongodb://localhost/RMS', { useNewUrlParser: true, useUnifiedTopology: true });

app.use(session({
    secret: 'secretKey',
    resave: false,
    saveUninitialized: true,
}));

const employeeSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    phone: String,
    password: String
});
const Employee = mongoose.model('Employee', employeeSchema);

const orderSchema = new mongoose.Schema({
    employeeId: mongoose.Schema.Types.ObjectId,
    items: [String],
    ename: String,
    date: Date,
    tnum: Number,
});
const Order = mongoose.model('Order', orderSchema);


const itemschema = new mongoose.Schema({
    category: String,
    iname: String,
    price: Number,
});
const Item = mongoose.model('Item', itemschema);

const adminSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    }
});

const Admin = mongoose.model('Admin', adminSchema);

app.get('/neworder', async (req, res) => {
    try {
        const fetchedItems = await Item.find();
        console.log(fetchedItems);
        res.render('orderPage', { items: fetchedItems }); // Pass fetchedItems to the view
    } catch (err) {
        res.status(500).send(err.message);
    }
})

app.get('/employee-signup', (req, res) => {
    res.sendFile(path.join(__dirname, 'employee-signup.html'))
});

app.get('/employee-login', (req, res) => {
    res.sendFile(path.join(__dirname, 'empl.html'))
});

app.get('/adminlogin', (req, res) => {
    res.sendFile(path.join(__dirname, 'adminlogin.html'))
});

app.get('/empportal', (req, res) => {
    res.sendFile(path.join(__dirname, 'empportal.html'));
})

app.get("/prevorder", async (req, res) => {
    const desiredEmployeeName = req.session.employeeName;
    console.log("hi");
    console.log(desiredEmployeeName);
    try {
        const eorders = await Order.find({ ename: desiredEmployeeName });
        console.log(eorders);
        res.render('employee orders', { eorders })
    } catch (error) {
        console.error('error retrieving orders', error);
        res.status(500).send('Error retrieving orders');
    }
});

app.get('/adminportal', async (req, res) => {
    try {
        const categories = await Item.distinct('category');
        res.render('adminportal', { categories });
    } catch (err) {
        res.status(500).send('Error fetching categories');
    }
});



app.get('/get-items', async (req, res) => {
    const categoryName = req.query.category;
    console.log("hi")
    console.log(categoryName);

    try {
        const items = await Item.find({ category: categoryName }).select('iname');

        const inames = items.map(item => item.iname);
        console.log(inames);
        res.json({ items: inames });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});



app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});

const crypto = require('crypto');
const { log } = require('console');
const { NONAME } = require('dns');
const secretKey = crypto.randomBytes(32).toString('hex');
console.log('Generated Secret Key:', secretKey);

app.post('/updateprice', async (req, res) => {
    const { category, dishName, nprice } = req.body;
    try {
        console.log(req.body)
        console.log(dishName);
        const item = await Item.findOneAndUpdate(
            { iname: dishName },
            { $set: { price: nprice } },
            { new: true }
        );

        if (!item) {
            return res.status(404).send('Item not found');
        }

        res.send("<script>alert('Price Updated succesfully'); window.location='/adminportal';</script>")
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
});


// app.post('/employee-signup', async (req, res) => {
//     try {
//         const hashedPassword = await bcrypt.hash(req.body.password, 10);
//         const employee = new Employee({
//             name: req.body.name,
//             email: req.body.email,
//             phone: req.body.phone,
//             password: hashedPassword
//         });

//         await employee.save();
//         res.redirect('/employee-login');
//     } catch (error) {
//         res.status(500).send(error);
//     }
// });

app.post('/employee-signup', async (req, res) => {
    try {
        const emp = await Employee.findOne({ email: req.body.email });
        if (emp) {
            res.send("<script>alert('email already registered'); window.location='/employee-signup';</script>")
        }
        else {
            const hashedPassword = await bcrypt.hash(req.body.password, 10);
            const employee = new Employee({
                name: req.body.name,
                email: req.body.email,
                phone: req.body.phone,
                password: hashedPassword
            });
            await employee.save();
            res.redirect('/employee-login');
        }
    } catch (error) {
        res.status(500).send(error);
    }
});

app.post('/adminlogin', async (req, res) => {
    const database = client.db('RMS');
    const { username, password } = req.body;

    const collection = database.collection('admins');

    try {
        const admin = await collection.findOne({ username });

        if (admin) {
            const storedPassword = admin.password;
            const inputPassword = password.trim();

            if (storedPassword === inputPassword) {
                res.status(200).redirect('/adminportal')
            } else {
                res.status(401).send('Invalid password');
            }
        } else {
            res.status(404).send('Admin not found');
        }
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.post('/alogout', (req, res) => {
    res.redirect('/adminlogin')
})
app.post('/elogout', (req, res) => {
    delete req.session.employeeName;
    res.redirect('/employee-login')
})

app.post('/employee-login', async (req, res) => {
    try {
        const employee = await Employee.findOne({ email: req.body.email });

        if (employee && await bcrypt.compare(req.body.password, employee.password)) {
            req.session.employeeName = employee.name
            res.redirect('/empportal')
            console.log(req.session.employeeName);
        } else {
            res.status(401).send("<script>alert('Invalid Password'); window.location='/employee-login';</script>")
        }
    } catch (error) {
        res.status(500).send(error);
    }
});

app.post('/submit-order', async (req, res) => {
    console.log(req.session.employeeName);
    if (req.session && req.session.employeeName) {
        try {
            const newOrder = new Order({
                employeeId: req.session.employeeId,
                items: req.body.dishes,
                ename: req.session.employeeName,
                date: currentDate,
                tnum: req.body.tableNumber
            });

            await newOrder.save();
            res.redirect('/empportal')
        } catch (error) {
            console.error('Error placing order:', error);
            res.status(500).send('Error placing order');
        }
    } else {
        res.status(401).send('You must be logged in to place an order');
    }
});

app.post('/add-item', async (req, res) => {
    const { addCategory, itemName, itemPrice } = req.body;
    const newitem = new Item({
        category: addCategory,
        iname: itemName,
        price: itemPrice
    });
    await newitem.save();
    res.send("<script>alert('item added succesfully'); window.location='/adminportal';</script>")
})

app.post('/generate-bill', async (req, res) => {
    const { date, tnum, items } = req.body;

    try {
        const itemPrices = await Item.find({ iname: { $in: items } }, 'iname price');

        if (!itemPrices || itemPrices.length === 0) {
            return res.status(404).send('Prices not found for some items');
        }

        const itemPricesMap = {};
        let subtotal = 0;

        itemPrices.forEach(item => {
            itemPricesMap[item.iname] = item.price;
            subtotal += item.price;
        });

        const taxRate = 0.035; // 3.5% tax rate
        const cgst = subtotal * taxRate;
        const sgst = subtotal * taxRate;
        const grandTotal = subtotal + cgst + sgst;

        res.render('bill_template', {
            date,
            tnum,
            items: Array.isArray(items) ? items : [items],
            itemPrices: itemPricesMap,
            subtotal: subtotal.toFixed(2),
            cgst: cgst.toFixed(2),
            sgst: sgst.toFixed(2),
            grandTotal: grandTotal.toFixed(2)
        });
    } catch (error) {
        console.error('Error retrieving item prices', error);
        res.status(500).send(`Error generating bill: ${error.message}`);
    }
});
