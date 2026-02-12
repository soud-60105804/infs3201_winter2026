const prompt = require('prompt-sync')()
const business = require('./business')

/**
 * Pads a value on the right with spaces until it reaches the requested width.
 *
 * @param {string} value The value to pad.
 * @param {number} width The minimum width.
 * @returns {string} Padded string.
 */
function padRight(value, width) {
    let text = String(value)
    while (text.length < width) {
        text = text + ' '
    }
    return text
}

/**
 * Builds a line made of a repeated character.
 *
 * @param {string} ch The character to repeat.
 * @param {number} count Number of times to repeat.
 * @returns {string} A repeated-character string.
 */
function buildLine(ch, count) {
    let out = ''
    for (let i = 0; i < count; i++) {
        out = out + ch
    }
    return out
}

/**
 * Prints all employees with aligned columns.
 *
 * @returns {Promise<void>} No return value.
 */
async function showAllEmployees() {
    const employees = await business.listEmployees()

    const idHeader = 'Employee ID'
    const nameHeader = 'Name'
    const phoneHeader = 'Phone'

    const idWidth = idHeader.length
    let nameWidth = nameHeader.length
    let phoneWidth = phoneHeader.length

    for (let i = 0; i < employees.length; i++) {
        const e = employees[i]
        const nLen = String(e.name).length
        const pLen = String(e.phone).length

        if (nLen > nameWidth) nameWidth = nLen
        if (pLen > phoneWidth) phoneWidth = pLen
    }

    if (nameWidth < 19) nameWidth = 19
    if (phoneWidth < 9) phoneWidth = 9

    console.log(`${padRight(idHeader, idWidth)} ${padRight(nameHeader, nameWidth)} ${padRight(phoneHeader, phoneWidth)}`)
    console.log(`${buildLine('-', idWidth)} ${buildLine('-', nameWidth)} ${buildLine('-', phoneWidth)}`)

    for (let i = 0; i < employees.length; i++) {
        const e = employees[i]
        console.log(`${padRight(e.employeeId, idWidth)} ${padRight(e.name, nameWidth)} ${padRight(e.phone, phoneWidth)}`)
    }
}

/**
 * Prompts the user for employee details, then adds the employee using business layer.
 *
 * @returns {Promise<void>} No return value.
 */
async function addNewEmployee() {
    const name = String(prompt('Enter employee name: ')).trim()
    const phone = String(prompt('Enter phone number: ')).trim()

    const result = await business.addEmployee(name, phone)
    console.log(result.message)
}

/**
 * Prompts for employee ID and shift ID, then assigns using business layer.
 *
 * @returns {Promise<void>} No return value.
 */
async function assignEmployeeToShift() {
    const employeeId = String(prompt('Enter employee ID: ')).trim().toUpperCase()
    const shiftId = String(prompt('Enter shift ID: ')).trim().toUpperCase()

    const result = await business.assignEmployeeToShift(employeeId, shiftId)
    console.log(result.message)
}

/**
 * Prompts for employee ID, then prints a CSV-like schedule.
 *
 * @returns {Promise<void>} No return value.
 */
async function viewSchedule() {
    const employeeId = String(prompt('Enter employee ID: ')).trim().toUpperCase()
    const result = await business.getEmployeeSchedule(employeeId)

    console.log('date,startTime,endTime')

    if (result.ok === false) {
        return
    }

    const rows = result.rows
    for (let i = 0; i < rows.length; i++) {
        const r = rows[i]
        console.log(`${r.date},${r.startTime},${r.endTime}`)
    }
}

/**
 * Prints the main menu.
 *
 * @returns {void} No return value.
 */
function printMenu() {
    console.log('1. Show all employees')
    console.log('2. Add new employee')
    console.log('3. Assign employee to shift')
    console.log('4. View employee schedule')
    console.log('5. Exit')
}

/**
 * Reads and validates a menu choice from 1 to 5.
 * Returns 0 when input is invalid.
 *
 * @returns {number} Valid choice (1..5) or 0 if invalid.
 */
function getMenuChoice() {
    const raw = String(prompt('What is your choice> ')).trim()
    const choice = Number(raw)

    if (Number.isNaN(choice) === true) return 0
    if (Number.isInteger(choice) === false) return 0
    if (choice < 1 || choice > 5) return 0

    return choice
}

/**
 * Runs the program loop until the user selects Exit.
 *
 * @returns {Promise<void>} No return value.
 */
async function runProgram() {
    while (true) {
        printMenu()
        const choice = getMenuChoice()

        if (choice === 1) {
            await showAllEmployees()
        } else if (choice === 2) {
            await addNewEmployee()
        } else if (choice === 3) {
            await assignEmployeeToShift()
        } else if (choice === 4) {
            await viewSchedule()
        } else if (choice === 5) {
            break
        } else {
            console.log('******** ERROR!!! Pick a number between 1 and 5')
        }
    }
}

runProgram()
