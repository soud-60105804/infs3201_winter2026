const path = require('path')
const express = require('express')
const mongodb = require('mongodb')
const { engine } = require('express-handlebars')
const business = require('./business')

const app = express()

app.use(express.urlencoded({ extended: false }))
app.use(express.static(path.join(__dirname, 'public')))

app.engine('hbs', engine({ extname: '.hbs', defaultLayout: false }))
app.set('view engine', 'hbs')
app.set('views', path.join(__dirname, 'views'))

/**
 * Checks whether a string is a valid MongoDB ObjectId.
 *
 * @param {string} id Id string.
 * @returns {boolean} True if valid, otherwise false.
 */
function isValidObjectId(id) {
    return mongodb.ObjectId.isValid(String(id).trim())
}

/**
 * Landing page route.
 * Displays all employees as links to their details pages.
 *
 * @param {import('express').Request} req Express request.
 * @param {import('express').Response} res Express response.
 * @returns {Promise<void>} Renders the home view.
 */
app.get('/', async function (req, res) {
    const employees = await business.listEmployees()
    res.render('home', { employees: employees })
})

/**
 * Employee details route.
 * Shows employee info and their shifts list.
 *
 * @param {import('express').Request} req Express request.
 * @param {import('express').Response} res Express response.
 * @returns {Promise<void>} Renders employeeDetails or sends 404.
 */
app.get('/employees/:id', async function (req, res) {
    const id = String(req.params.id).trim()

    if (isValidObjectId(id) === false) {
        return res.status(404).send('Employee not found')
    }

    const employee = await business.getEmployeeById(id)
    if (employee === null) {
        return res.status(404).send('Employee not found')
    }

    const schedule = await business.getEmployeeSchedule(id)
    const rows = schedule.rows

    for (let i = 0; i < rows.length; i++) {
        const start = String(rows[i].startTime)
        rows[i].isBeforeNoon = (start < '12:00')
    }

    res.render('employeeDetails', {
        employee: employee,
        rows: rows
    })
})

/**
 * Edit employee form route.
 *
 * @param {import('express').Request} req Express request.
 * @param {import('express').Response} res Express response.
 * @returns {Promise<void>} Renders employeeEdit or sends 404.
 */
app.get('/employees/:id/edit', async function (req, res) {
    const id = String(req.params.id).trim()

    if (isValidObjectId(id) === false) {
        return res.status(404).send('Employee not found')
    }

    const employee = await business.getEmployeeById(id)
    if (employee === null) {
        return res.status(404).send('Employee not found')
    }

    res.render('employeeEdit', { employee: employee })
})

/**
 * Edit employee handler route.
 *
 * @param {import('express').Request} req Express request.
 * @param {import('express').Response} res Express response.
 * @returns {Promise<void>} Redirects to employee page on success.
 */
app.post('/employees/:id/edit', async function (req, res) {
    const id = String(req.params.id).trim()
    const name = String(req.body.name || '').trim()
    const phone = String(req.body.phone || '').trim()

    if (isValidObjectId(id) === false) {
        return res.status(404).send('Employee not found')
    }

    if (name.length === 0) {
        return res.status(400).send('Validation error: Name cannot be empty')
    }

    const phoneOk = /^\d{4}-\d{4}$/.test(phone)
    if (phoneOk === false) {
        return res.status(400).send('Validation error: Phone must be in format dddd-dddd')
    }

    const result = await business.updateEmployeeDetails(id, name, phone)
    if (result.ok === false) {
        return res.status(404).send(result.message)
    }

    res.redirect('/employees/' + id)
})

/**
 * Starts the HTTP server on port 8000.
 *
 * @returns {void} No return value.
 */
function startServer() {
    app.listen(8000, function () {
        console.log('Server running on http://127.0.0.1:8000')
    })
}

startServer()