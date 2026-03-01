const prompt = require('prompt-sync')()
const business = require('./business')

function padRight(value, width) {
    let text = String(value)
    while (text.length < width) {
        text = text + ' '
    }
    return text
}

function buildLine(ch, count) {
    let out = ''
    for (let i = 0; i < count; i++) {
        out = out + ch
    }
    return out
}

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

async function addNewEmployee() {
    const name = String(prompt('Enter employee name: ')).trim()
    const phone = String(prompt('Enter phone number: ')).trim()

    const result = await business.addEmployee(name, phone)
    console.log(result.message)
}

async function viewSchedule() {
    const employeeId = String(prompt('Enter employee ID: ')).trim().toUpperCase()
    const result = await business.getEmployeeSchedule(employeeId)

    if (result.ok === false) {
        console.log('Employee does not exist')
        return
    }

    console.log('date,startTime,endTime')

    const rows = result.rows
    for (let i = 0; i < rows.length; i++) {
        const r = rows[i]
        console.log(`${r.date},${r.startTime},${r.endTime}`)
    }
}

function printMenu() {
    console.log('1. Show all employees')
    console.log('2. Add new employee')
    console.log('3. View employee schedule')
    console.log('4. Exit')
}

function getMenuChoice() {
    const raw = String(prompt('What is your choice> ')).trim()
    const choice = Number(raw)

    if (Number.isNaN(choice) === true) return 0
    if (Number.isInteger(choice) === false) return 0
    if (choice < 1 || choice > 4) return 0

    return choice
}

async function runProgram() {
    while (true) {
        printMenu()
        const choice = getMenuChoice()

        if (choice === 1) {
            await showAllEmployees()
        } else if (choice === 2) {
            await addNewEmployee()
        } else if (choice === 3) {
            await viewSchedule()
        } else if (choice === 4) {
            break
        } else {
            console.log('******** ERROR!!! Pick a number between 1 and 4')
        }
    }
}

runProgram()