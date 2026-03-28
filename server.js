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
 * Reads one cookie value from the Cookie header.
 *
 * @param {import('express').Request} req Express request.
 * @param {string} name Cookie name.
 * @returns {string} Cookie value or empty string.
 */
function readCookie(req, name) {
    const header = String(req.headers.cookie || '')
    if (header.length === 0) {
        return ''
    }

    const parts = header.split(';')

    for (let i = 0; i < parts.length; i++) {
        const piece = String(parts[i]).trim()
        const eqIndex = piece.indexOf('=')

        if (eqIndex !== -1) {
            const key = piece.substring(0, eqIndex).trim()
            const value = piece.substring(eqIndex + 1).trim()

            if (key === name) {
                return decodeURIComponent(value)
            }
        }
    }

    return ''
}

/**
 * Returns true for public routes.
 *
 * @param {string} routePath Route path.
 * @returns {boolean} True if public.
 */
function isPublicRoute(routePath) {
    const cleanPath = String(routePath)

    if (cleanPath === '/login') {
        return true
    }

    if (cleanPath === '/logout') {
        return true
    }

    return false
}

/**
 * Loads the current session, if any, and extends it.
 *
 * @param {import('express').Request} req Express request.
 * @param {import('express').Response} res Express response.
 * @param {import('express').NextFunction} next Express next function.
 * @returns {Promise<void>} Calls next.
 */
async function sessionLoaderMiddleware(req, res, next) {
    req.isAuthenticated = false
    req.username = ''
    req.sessionKey = ''

    const sessionKey = readCookie(req, 'sessionKey')

    if (sessionKey.length === 0) {
        return next()
    }

    const session = await business.getValidSession(sessionKey)

    if (session === null) {
        res.clearCookie('sessionKey')
        return next()
    }

    const newExpiry = await business.extendSession(sessionKey)

    res.cookie('sessionKey', sessionKey, {
        httpOnly: true,
        expires: newExpiry
    })

    req.isAuthenticated = true
    req.username = String(session.username)
    req.sessionKey = sessionKey

    next()
}

/**
 * Writes one security log entry for each request.
 *
 * @param {import('express').Request} req Express request.
 * @param {import('express').Response} res Express response.
 * @param {import('express').NextFunction} next Express next function.
 * @returns {Promise<void>} Calls next.
 */
async function securityLogMiddleware(req, res, next) {
    await business.logSecurityAccess(req.username, req.originalUrl, req.method)
    next()
}

/**
 * Protects all non-public routes.
 *
 * @param {import('express').Request} req Express request.
 * @param {import('express').Response} res Express response.
 * @param {import('express').NextFunction} next Express next function.
 * @returns {void} Redirects or calls next.
 */
function authMiddleware(req, res, next) {
    if (isPublicRoute(req.path) === true) {
        return next()
    }

    if (req.isAuthenticated === true) {
        return next()
    }

    res.redirect('/login?message=' + encodeURIComponent('Please log in first'))
}

app.use(sessionLoaderMiddleware)
app.use(securityLogMiddleware)
app.use(authMiddleware)

/**
 * Login page route.
 *
 * @param {import('express').Request} req Express request.
 * @param {import('express').Response} res Express response.
 * @returns {void} Renders login page.
 */
app.get('/login', function (req, res) {
    if (req.isAuthenticated === true) {
        return res.redirect('/')
    }

    res.render('login', {
        message: String(req.query.message || '')
    })
})

/**
 * Login form submit route.
 *
 * @param {import('express').Request} req Express request.
 * @param {import('express').Response} res Express response.
 * @returns {Promise<void>} Redirects to login or home.
 */
app.post('/login', async function (req, res) {
    const username = String(req.body.username || '').trim()
    const password = String(req.body.password || '')

    const result = await business.validateLogin(username, password)

    if (result.ok === false) {
        return res.redirect('/login?message=' + encodeURIComponent('Invalid username or password'))
    }

    const session = await business.createSession(result.username)

    res.cookie('sessionKey', session.sessionKey, {
        httpOnly: true,
        expires: session.expiresAt
    })

    res.redirect('/')
})

/**
 * Logout route.
 *
 * @param {import('express').Request} req Express request.
 * @param {import('express').Response} res Express response.
 * @returns {Promise<void>} Clears cookie and redirects.
 */
app.get('/logout', async function (req, res) {
    if (req.sessionKey.length > 0) {
        await business.deleteSession(req.sessionKey)
    }

    res.clearCookie('sessionKey')
    res.redirect('/login?message=' + encodeURIComponent('You have been logged out'))
})

/**
 * Landing page route.
 *
 * @param {import('express').Request} req Express request.
 * @param {import('express').Response} res Express response.
 * @returns {Promise<void>} Renders home view.
 */
app.get('/', async function (req, res) {
    const employees = await business.listEmployees()

    res.render('home', {
        employees: employees,
        username: req.username
    })
})

/**
 * Employee details route.
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
        rows: rows,
        username: req.username
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

    res.render('employeeEdit', {
        employee: employee,
        username: req.username
    })
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
    app.listen(8001, function () {
        console.log('AUTH SERVER running on http://127.0.0.1:8001')
    })
}
/**
 * Protected employee photo route.
 *
 * @param {import('express').Request} req Express request.
 * @param {import('express').Response} res Express response.
 * @returns {Promise<void>} Sends photo file or 404.
 */
app.get('/employees/:id/photo', async function (req, res) {
    const id = String(req.params.id).trim()

    if (isValidObjectId(id) === false) {
        return res.status(404).send('Employee not found')
    }

    const employee = await business.getEmployeeById(id)
    if (employee === null) {
        return res.status(404).send('Employee not found')
    }

    if (!employee.photoFilename) {
        return res.status(404).send('Photo not found')
    }

    const fileName = path.basename(String(employee.photoFilename).trim())
    const photoPath = path.join(__dirname, 'employee_photos', fileName)

    res.sendFile(photoPath, function (err) {
        if (err) {
            res.status(404).send('Photo not found')
        }
    })
})

startServer()