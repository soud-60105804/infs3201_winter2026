const crypto = require('crypto')
const storage = require('./storage')

/**
 * Sorts schedule rows by date then startTime using selection sort.
 *
 * @param {Object[]} rows Array of rows.
 * @returns {void} No return value.
 */
function sortScheduleRows(rows) {
    for (let i = 0; i < rows.length; i++) {
        let minIndex = i

        for (let j = i + 1; j < rows.length; j++) {
            const left = rows[j]
            const right = rows[minIndex]

            const leftKey = String(left.date) + ' ' + String(left.startTime)
            const rightKey = String(right.date) + ' ' + String(right.startTime)

            if (leftKey < rightKey) {
                minIndex = j
            }
        }

        if (minIndex !== i) {
            const temp = rows[i]
            rows[i] = rows[minIndex]
            rows[minIndex] = temp
        }
    }
}

/**
 * Adds a string id field for template use.
 *
 * @param {Object} employee Employee document.
 * @returns {void} No return value.
 */
function attachDisplayId(employee) {
    if (employee !== null && employee !== undefined) {
        employee.id = String(employee._id)
    }
}

/**
 * Creates a SHA256 hash of a password.
 *
 * @param {string} password Plain password.
 * @returns {string} SHA256 hash string.
 */
function hashPassword(password) {
    return crypto.createHash('sha256').update(String(password)).digest('hex')
}

/**
 * Creates a random session key.
 *
 * @returns {string} Session key.
 */
function createSessionKey() {
    return crypto.randomBytes(32).toString('hex')
}

/**
 * Returns a new expiry time 5 minutes from now.
 *
 * @returns {Date} Expiry date.
 */
function getNewExpiryDate() {
    return new Date(Date.now() + 5 * 60 * 1000)
}

/**
 * Returns all employees.
 *
 * @returns {Promise<Object[]>} Array of employees.
 */
async function listEmployees() {
    const employees = await storage.getAllEmployees()

    for (let i = 0; i < employees.length; i++) {
        attachDisplayId(employees[i])
    }

    return employees
}

/**
 * Returns a single employee by MongoDB _id string.
 *
 * @param {string} id Employee _id string.
 * @returns {Promise<Object|null>} Employee object or null.
 */
async function getEmployeeById(id) {
    const employee = await storage.findEmployeeById(id)

    if (employee !== null) {
        attachDisplayId(employee)
    }

    return employee
}

/**
 * Adds a new employee after validating name and phone.
 *
 * @param {string} name Employee name.
 * @param {string} phone Phone number.
 * @returns {Promise<{ok:boolean,message:string,id:string}>} Result object.
 */
async function addEmployee(name, phone) {
    const cleanName = String(name).trim()
    const cleanPhone = String(phone).trim()

    if (cleanName.length === 0) {
        return { ok: false, message: 'Name cannot be empty', id: '' }
    }

    if (cleanPhone.length === 0) {
        return { ok: false, message: 'Phone cannot be empty', id: '' }
    }

    const result = await storage.insertEmployee({
        name: cleanName,
        phone: cleanPhone
    })

    return {
        ok: true,
        message: 'Employee added',
        id: String(result.insertedId)
    }
}

/**
 * Updates an employee's name and phone.
 *
 * @param {string} id Employee _id string.
 * @param {string} name New name.
 * @param {string} phone New phone.
 * @returns {Promise<{ok:boolean,message:string}>} Result object.
 */
async function updateEmployeeDetails(id, name, phone) {
    const cleanName = String(name).trim()
    const cleanPhone = String(phone).trim()

    const employee = await storage.findEmployeeById(id)
    if (employee === null) {
        return { ok: false, message: 'Employee does not exist' }
    }

    await storage.updateEmployeeDetails(id, cleanName, cleanPhone)
    return { ok: true, message: 'Employee updated' }
}

/**
 * Returns schedule rows for a given employee.
 *
 * @param {string} id Employee _id string.
 * @returns {Promise<{ok:boolean,rows:Object[]}>} Status and rows.
 */
async function getEmployeeSchedule(id) {
    const employee = await storage.findEmployeeById(id)

    if (employee === null) {
        return { ok: false, rows: [] }
    }

    const shifts = await storage.findShiftsByEmployeeId(id)
    const rows = []

    for (let i = 0; i < shifts.length; i++) {
        rows.push({
            date: shifts[i].date,
            startTime: shifts[i].startTime,
            endTime: shifts[i].endTime
        })
    }

    if (rows.length > 0) {
        sortScheduleRows(rows)
    }

    return { ok: true, rows: rows }
}

/**
 * Validates a login attempt.
 *
 * @param {string} username Username.
 * @param {string} password Plain password.
 * @returns {Promise<{ok:boolean,username:string}>} Validation result.
 */
async function validateLogin(username, password) {
    const cleanUsername = String(username).trim()
    const cleanPassword = String(password)

    if (cleanUsername.length === 0 || cleanPassword.length === 0) {
        return { ok: false, username: '' }
    }

    const user = await storage.findUserByUsername(cleanUsername)
    if (user === null) {
        return { ok: false, username: '' }
    }

    const hash = hashPassword(cleanPassword)
    if (hash !== String(user.passwordHash)) {
        return { ok: false, username: '' }
    }

    return { ok: true, username: cleanUsername }
}

/**
 * Creates and stores a new session.
 *
 * @param {string} username Username.
 * @returns {Promise<{sessionKey:string,expiresAt:Date}>} Session details.
 */
async function createSession(username) {
    const sessionKey = createSessionKey()
    const expiresAt = getNewExpiryDate()

    await storage.insertSession({
        sessionKey: sessionKey,
        username: String(username).trim(),
        expiresAt: expiresAt
    })

    return {
        sessionKey: sessionKey,
        expiresAt: expiresAt
    }
}

/**
 * Gets a valid session if it exists.
 *
 * @param {string} sessionKey Session key.
 * @returns {Promise<Object|null>} Session document or null.
 */
async function getValidSession(sessionKey) {
    await storage.deleteExpiredSessions()

    const session = await storage.findSessionByKey(sessionKey)
    if (session === null) {
        return null
    }

    if (new Date(session.expiresAt).getTime() <= Date.now()) {
        await storage.deleteSessionByKey(sessionKey)
        return null
    }

    return session
}

/**
 * Extends a session by another 5 minutes.
 *
 * @param {string} sessionKey Session key.
 * @returns {Promise<Date>} New expiry date.
 */
async function extendSession(sessionKey) {
    const expiresAt = getNewExpiryDate()
    await storage.updateSessionExpiry(sessionKey, expiresAt)
    return expiresAt
}

/**
 * Deletes a session.
 *
 * @param {string} sessionKey Session key.
 * @returns {Promise<void>} No return value.
 */
async function deleteSession(sessionKey) {
    await storage.deleteSessionByKey(sessionKey)
}

/**
 * Records a security access log entry.
 *
 * @param {string} username Username if known.
 * @param {string} url Accessed URL.
 * @param {string} method HTTP method.
 * @returns {Promise<void>} No return value.
 */
async function logSecurityAccess(username, url, method) {
    await storage.insertSecurityLog({
        timestamp: new Date(),
        username: String(username || ''),
        url: String(url || ''),
        method: String(method || '')
    })
}

module.exports = {
    listEmployees,
    getEmployeeById,
    addEmployee,
    updateEmployeeDetails,
    getEmployeeSchedule,
    validateLogin,
    createSession,
    getValidSession,
    extendSession,
    deleteSession,
    logSecurityAccess
}