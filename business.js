const storage = require('./storage')

/**
 * Calculates the next auto-increment style employee ID (E + 3 digits).
 *
 * @param {Object[]} employees Employees array.
 * @returns {string} Next employee ID (example: E006).
 */
function generateNextEmployeeId(employees) {
    let maxNum = 0

    for (let i = 0; i < employees.length; i++) {
        const e = employees[i]
        const id = String(e.employeeId).trim().toUpperCase()

        if (id.length === 4 && id[0] === 'E') {
            const numPart = id.substring(1)
            const parsed = Number(numPart)

            if (Number.isNaN(parsed) === false) {
                if (parsed > maxNum) {
                    maxNum = parsed
                }
            }
        }
    }

    const nextNum = maxNum + 1
    const padded = String(nextNum).padStart(3, '0')
    return 'E' + padded
}

/**
 * computeShiftDuration(startTime, endTime)
 * LLM used: ChatGPT
 * Prompt used:
 * "Write a JavaScript function computeShiftDuration(startTime, endTime) that takes times in 'HH:MM'
 * 24-hour format and returns the hours as a real number. Example 11:00 to 13:30 => 2.5.
 * Validate inputs, return NaN on invalid input. Handle overnight shifts where endTime is earlier
 * by assuming it ends next day."
 *
 * @param {string} startTime Time in "HH:MM".
 * @param {string} endTime Time in "HH:MM".
 * @returns {number} Hours as a real number, or NaN if invalid.
 */
function computeShiftDuration(startTime, endTime) {
    const s = String(startTime).trim()
    const e = String(endTime).trim()

    if (s.length !== 5 || e.length !== 5) return NaN
    if (s[2] !== ':' || e[2] !== ':') return NaN

    const sh = Number(s.substring(0, 2))
    const sm = Number(s.substring(3, 5))
    const eh = Number(e.substring(0, 2))
    const em = Number(e.substring(3, 5))

    if (!Number.isInteger(sh) || !Number.isInteger(sm) || !Number.isInteger(eh) || !Number.isInteger(em)) return NaN
    if (sh < 0 || sh > 23) return NaN
    if (eh < 0 || eh > 23) return NaN
    if (sm < 0 || sm > 59) return NaN
    if (em < 0 || em > 59) return NaN

    let startMinutes = sh * 60 + sm
    let endMinutes = eh * 60 + em

    // Overnight shift (end next day)
    if (endMinutes < startMinutes) {
        endMinutes = endMinutes + 24 * 60
    }

    const diffMinutes = endMinutes - startMinutes
    return diffMinutes / 60
}

/**
 * Sorts schedule rows by date then startTime (ascending) using selection sort.
 *
 * @param {Object[]} rows Array of objects like {date,startTime,endTime}.
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
 * Returns employees list.
 *
 * @returns {Promise<Object[]>} Employees array.
 */
async function listEmployees() {
    return await storage.getAllEmployees()
}

/**
 * Adds a new employee (validates inputs) and auto-generates next ID.
 *
 * @param {string} name Employee name.
 * @param {string} phone Phone number.
 * @returns {Promise<{ok:boolean,message:string}>} Result status + message.
 */
async function addEmployee(name, phone) {
    const cleanName = String(name).trim()
    const cleanPhone = String(phone).trim()

    if (cleanName.length === 0) {
        return { ok: false, message: 'Name cannot be empty' }
    }
    if (cleanPhone.length === 0) {
        return { ok: false, message: 'Phone cannot be empty' }
    }

    const employees = await storage.getAllEmployees()
    const nextId = generateNextEmployeeId(employees)

    const newEmployee = {
        employeeId: nextId,
        name: cleanName,
        phone: cleanPhone
    }

    await storage.insertEmployee(newEmployee)
    return { ok: true, message: 'Employee added...' }
}

/**
 * Assigns an employee to a shift with:
 * - referential integrity (employee and shift must exist)
 * - composite key (no duplicate employeeId+shiftId)
 * - schedule limit (maxDailyHours from config.json)
 *
 * @param {string} employeeId Employee ID.
 * @param {string} shiftId Shift ID.
 * @returns {Promise<{ok:boolean,message:string}>} Result status + message.
 */
async function assignEmployeeToShift(employeeId, shiftId) {
    const empId = String(employeeId).trim().toUpperCase()
    const shId = String(shiftId).trim().toUpperCase()

    const employee = await storage.findEmployeeById(empId)
    if (employee === null) {
        return { ok: false, message: 'Employee does not exist' }
    }

    const shift = await storage.findShiftById(shId)
    if (shift === null) {
        return { ok: false, message: 'Shift does not exist' }
    }

    const exists = await storage.assignmentExists(empId, shId)
    if (exists) {
        return { ok: false, message: 'Employee already assigned to shift' }
    }

    const cfg = await storage.loadConfig()
    const maxDailyHours = Number(cfg.maxDailyHours)

    const newShiftHours = computeShiftDuration(shift.startTime, shift.endTime)
    if (Number.isNaN(newShiftHours)) {
        return { ok: false, message: 'Shift time format is invalid in shifts.json' }
    }

    // Sum existing hours for same employee on the same date
    let totalHoursForDay = 0
    const empAssignments = await storage.findAssignmentsByEmployeeId(empId)

    for (let i = 0; i < empAssignments.length; i++) {
        const a = empAssignments[i]
        const s = await storage.findShiftById(a.shiftId)
        if (s !== null) {
            if (String(s.date) === String(shift.date)) {
                const h = computeShiftDuration(s.startTime, s.endTime)
                if (Number.isNaN(h) === false) {
                    totalHoursForDay = totalHoursForDay + h
                }
            }
        }
    }

    const newTotal = totalHoursForDay + newShiftHours
    if (newTotal > maxDailyHours) {
        return {
            ok: false,
            message: `Cannot assign shift. Daily limit exceeded (${newTotal} > ${maxDailyHours})`
        }
    }

    await storage.insertAssignment({
        employeeId: empId,
        shiftId: shId
    })

    return { ok: true, message: 'Shift Recorded' }
}

/**
 * Returns schedule rows for a given employee, sorted by date then startTime.
 *
 * @param {string} employeeId Employee ID.
 * @returns {Promise<{ok:boolean,rows:Object[]}>} Status and array of rows.
 */
async function getEmployeeSchedule(employeeId) {
    const empId = String(employeeId).trim().toUpperCase()

    const employee = await storage.findEmployeeById(empId)
    if (employee === null) {
        return { ok: false, rows: [] }
    }

    const assignments = await storage.findAssignmentsByEmployeeId(empId)
    const rows = []

    for (let i = 0; i < assignments.length; i++) {
        const a = assignments[i]
        const shift = await storage.findShiftById(a.shiftId)
        if (shift !== null) {
            rows.push({
                date: shift.date,
                startTime: shift.startTime,
                endTime: shift.endTime
            })
        }
    }

    if (rows.length > 0) {
        sortScheduleRows(rows)
    }

    return { ok: true, rows: rows }
}

module.exports = {
    listEmployees,
    addEmployee,
    assignEmployeeToShift,
    getEmployeeSchedule,

    computeShiftDuration
}
