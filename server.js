const path = require('path')
const express = require('express')
const { engine } = require('express-handlebars')
const business = require('./business')

const app = express()

app.use(express.urlencoded({ extended: false }))
app.use(express.static(path.join(__dirname, 'public')))

app.engine('hbs', engine({ extname: '.hbs', defaultLayout: false }))
app.set('view engine', 'hbs')
app.set('views', path.join(__dirname, 'views'))

// Landing page: list employees
app.get('/', async (req, res) => {
    const employees = await business.listEmployees()
    res.render('home', { employees: employees })
})

// Employee details: show info + schedule
app.get('/employees/:id', async (req, res) => {
    const id = String(req.params.id).trim().toUpperCase()

    const employee = await business.getEmployeeById(id)
    if (employee === null) {
        return res.status(404).send('Employee not found')
    }

    const schedule = await business.getEmployeeSchedule(id)
    const rows = schedule.rows

    // Add flags for highlighting (NO .map / .filter)
    for (let i = 0; i < rows.length; i++) {
        const start = String(rows[i].startTime)
        rows[i].isBeforeNoon = (start < '12:00')
    }

    res.render('employeeDetails', {
        employee: employee,
        rows: rows
    })
})

// Edit form (prefilled)
app.get('/employees/:id/edit', async (req, res) => {
    const id = String(req.params.id).trim().toUpperCase()

    const employee = await business.getEmployeeById(id)
    if (employee === null) {
        return res.status(404).send('Employee not found')
    }

    res.render('employeeEdit', { employee: employee })
})

// Edit handler (POST) + server-side validation + PRG
app.post('/employees/:id/edit', async (req, res) => {
    const id = String(req.params.id).trim().toUpperCase()
    const name = String(req.body.name || '').trim()
    const phone = String(req.body.phone || '').trim()

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

    // PRG: redirect to landing page
    res.redirect('/')
})

app.listen(8000, () => {
    console.log('Server running on http://127.0.0.1:8000')
})