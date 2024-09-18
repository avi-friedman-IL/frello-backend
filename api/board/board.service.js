import { MongoClient, ObjectId } from 'mongodb'
const mongoId = ObjectId.createFromHexString

import { logger } from '../../services/logger.service.js'
import { makeId } from '../../services/util.service.js'
import { dbService } from '../../services/db.service.js'
import { asyncLocalStorage } from '../../services/als.service.js'

const PAGE_SIZE = 3

export const boardService = {
    remove,
    query,
    getById,
    add,
    update,
    addBoardMsg,
    removeBoardMsg,
}

async function query(filterBy = { txt: '' }) {
    try {
        const criteria = _buildCriteria(filterBy)
        const sort = _buildSort(filterBy)

        const collection = await dbService.getCollection('board')
        var boardCursor = await collection.find(criteria, { sort })

        // if (filterBy.pageIdx !== undefined) {
        //     boardCursor.skip(filterBy.pageIdx * PAGE_SIZE).limit(PAGE_SIZE)
        // }

        const boards = boardCursor.toArray()

        return boards
    } catch (err) {
        logger.error('cannot find boards', err)
        throw err
    }
}

async function getById(boardId, filterBy) {
    try {
        const collection = await dbService.getCollection('board')

        const criteria = { _id: mongoId(boardId) }
        const board = await collection.findOne(criteria)

        if (filterBy.txt) {
            const regex = new RegExp(filterBy.txt, 'i')
            board.groups = board.groups.filter(
                group => group.title.match(regex)
                    || group.tasks.some(task => task.title.match(regex))
            )
        }
        if (filterBy.noMembers === 'true') {
            board.groups = board.groups.map(group => {
                group.tasks = group.tasks?.filter(
                    task => task.members.length === 0
                )
                return group
            })
        }
        if (filterBy.noDueDate === 'true') {
            board.groups = board.groups.map(group => {
                group.tasks = group.tasks?.filter(task => task.dueDate === '')
                return group
            })
        }
        if (filterBy.noLabels === 'true') {
            board.groups = board.groups.map(group => {
                group.tasks = group.tasks?.filter(
                    task => task.labels?.length === 0
                )
                return group
            })
        }
        if (filterBy.selectMembers.length > 0) {
            board.groups = board.groups.map(group => {
                group.tasks = group.tasks?.filter(task =>
                    task.members.some(member =>
                        filterBy.selectMembers.includes(member._id)
                    )
                )
                return group
            })
        }
        if (filterBy.selectLabels.length > 0) {
            board.groups = board.groups.map(group => {
                group.tasks = group.tasks?.filter(task =>
                    task.labels?.some(label =>
                        filterBy.selectLabels.includes(label.color)
                    )
                )
                return group
            })
        }

        return board
    } catch (err) {
        logger.error(`while finding board ${boardId}`, err)
        throw err
    }
}

async function remove(boardId) {
    // const { loggedinUser } = asyncLocalStorage.getStore()
    // const { _id: ownerId, isAdmin } = loggedinUser

    try {
        const criteria = {
            _id: mongoId(boardId),
        }
        // if (!isAdmin) criteria['owner._id'] = ownerId

        const collection = await dbService.getCollection('board')
        const res = await collection.deleteOne(criteria)

        if (res.deletedCount === 0) throw 'Not your board'
        return boardId
    } catch (err) {
        logger.error(`cannot remove board ${boardId}`, err)
        throw err
    }
}

async function add(board) {
    try {
        const collection = await dbService.getCollection('board')
        await collection.insertOne(board)

        return board
    } catch (err) {
        logger.error('cannot insert board', err)
        throw err
    }
}

async function update(board) {
    const boardToSave = { ...board }

    try {
        const criteria = { _id: mongoId(board._id) }
        delete boardToSave._id
        const collection = await dbService.getCollection('board')
        await collection.updateOne(criteria, { $set: boardToSave })

        return board
    } catch (err) {
        logger.error(`cannot update board ${board._id}`, err)
        throw err
    }
}

async function addBoardMsg(boardId, msg) {
    try {
        const criteria = { _id: mongoId(boardId) }
        msg.id = makeId()

        const collection = await dbService.getCollection('board')
        await collection.updateOne(criteria, { $push: { msgs: msg } })

        return msg
    } catch (err) {
        logger.error(`cannot add board msg ${boardId}`, err)
        throw err
    }
}

async function removeBoardMsg(boardId, msgId) {
    try {
        const criteria = { _id: mongoId(boardId) }

        const collection = await dbService.getCollection('board')
        await collection.updateOne(criteria, { $pull: { msgs: { id: msgId } } })

        return msgId
    } catch (err) {
        logger.error(`cannot add board msg ${boardId}`, err)
        throw err
    }
}

function _buildCriteria(filterBy) {
    const criteria = {}
    if (filterBy.txt) {
        const txtCriteria = { $regex: filterBy.txt, $options: 'i' }
        criteria.$or = [{ title: txtCriteria }, { description: txtCriteria }]
    }

    return criteria
}

function _buildSort(filterBy) {
    if (!filterBy.sortField) return {}
    return { [filterBy.sortField]: filterBy.sortDir }
}

function _createBoards() {
    return [
        {
            title: 'Robot dev proj',
            isStarred: false,
            archivedAt: 1589983468418,
            createdBy: {
                id: 'u101',
                fullname: 'Abi Abambi',
                imgUrl: 'http://some-img',
            },
            style: {
                backgroundColor: '#61bd4f',
                backgroundImage:
                    'https://cdn.pixabay.com/photo/2024/07/05/22/30/penguin-8875750_1280.jpg',
            },

            labels: [
                {
                    id: 'L101',
                    title: '',
                    color: '#7F5F01',
                    colorName: 'Brown',
                    isEditable: true,
                },
                {
                    id: 'L102',
                    title: '',
                    color: '#A54800',
                    colorName: 'Dark Orange',
                    isEditable: true,
                },
                {
                    id: 'L103',
                    title: '',
                    color: '#AE2E24',
                    colorName: 'Red',
                    isEditable: true,
                },
                {
                    id: 'L104',
                    title: '',
                    color: '#5E4DB2',
                    colorName: 'Purple',
                    isEditable: true,
                },
                {
                    id: 'L105',
                    title: '',
                    color: '#0055CC',
                    colorName: 'Blue',
                    isEditable: true,
                },
                {
                    id: 'L106',
                    title: '',
                    color: '#206A83',
                    colorName: 'Teal',
                    isEditable: true,
                },
                {
                    id: 'L107',
                    title: '',
                    color: '#A1BDD914',
                    colorName: 'Light Green',
                    isEditable: true,
                },
            ],

            members: [
                {
                    id: 'u101',
                    fullname: 'Natia ',
                    imgUrl: 'https://www.google.com',
                    color: '#61bd4f',
                },
                {
                    id: 'u102',
                    fullname: 'Avi',
                    imgUrl: 'https://www.google.com',
                    color: '#f2d600',
                },
                {
                    id: 'u103',
                    fullname: 'Yana',
                    imgUrl: 'https://www.google.com',
                    color: '#f3a600',
                },
            ],
            groups: [
                {
                    id: 'g101',
                    title: 'Design Phase',
                    archivedAt: 1589983468418,
                    tasks: [
                        {
                            id: 'c101',
                            title: 'Design wireframes',
                            labels: [],
                            description: '',
                            checklists: [
                                {
                                    id: 'chk101',
                                    title: 'Design Process',
                                    items: [
                                        {
                                            id: 'item101',
                                            text: 'Gather requirements from the team',
                                            isChecked: true,
                                        },
                                        {
                                            id: 'item102',
                                            text: 'Create wireframe sketches',
                                            isChecked: false,
                                        },
                                        {
                                            id: 'item103',
                                            text: 'Design high-fidelity mockups',
                                            isChecked: false,
                                        },
                                    ],
                                },
                                {
                                    id: 'chk102',
                                    title: 'Review Process',
                                    items: [
                                        {
                                            id: 'item201',
                                            text: 'Review mockups with the team',
                                            isChecked: false,
                                        },
                                        {
                                            id: 'item202',
                                            text: 'Make adjustments based on feedback',
                                            isChecked: false,
                                        },
                                    ],
                                },
                            ],
                            members: [
                                {
                                    id: 'u101',
                                    fullname: 'Natia ',
                                    imgUrl: 'https://www.google.com',
                                    color: '#61bd4f',
                                },
                                {
                                    id: 'u102',
                                    fullname: 'Avi',
                                    imgUrl: 'https://www.google.com',
                                    color: '#f2d600',
                                },
                            ],
                            attachments: '', // שדה attachments ריק
                            comments: [
                                'Create wireframes for the new Trello feature',
                                'Incorporate feedback from the last review',
                            ],
                            cover: { color: '', img: '' },
                            dueDate: '',
                        },
                        {
                            id: 'c102',
                            title: 'Create design mockups',
                            labels: [],
                            description: '',
                            checklists: [
                                {
                                    id: 'chk10656',
                                    title: 'Design Process',
                                    items: [
                                        {
                                            id: 'item101',
                                            text: 'Gather requirements from the team',
                                            isChecked: true,
                                        },
                                        {
                                            id: 'item102',
                                            text: 'Create wireframe sketches',
                                            isChecked: false,
                                        },
                                        {
                                            id: 'item103',
                                            text: 'Design high-fidelity mockups',
                                            isChecked: false,
                                        },
                                    ],
                                },
                                {
                                    id: 'chk106252222256',
                                    title: 'Design Process',
                                    items: [
                                        {
                                            id: 'item101',
                                            text: 'Gather requirements from the team',
                                            isChecked: true,
                                        },
                                        {
                                            id: 'item102',
                                            text: 'Create wireframe sketches',
                                            isChecked: false,
                                        },
                                        {
                                            id: 'item103',
                                            text: 'Design high-fidelity mockups',
                                            isChecked: false,
                                        },
                                    ],
                                },

                                {
                                    id: 'chk1022525',
                                    title: 'Review Process',
                                    items: [
                                        {
                                            id: 'item201',
                                            text: 'Review mockups with the team',
                                            isChecked: false,
                                        },
                                        {
                                            id: 'item202',
                                            text: 'Make adjustments based on feedback',
                                            isChecked: false,
                                        },
                                    ],
                                },
                            ],
                            members: [],
                            attachments: '', // שדה attachments ריק
                            comments: [
                                'Design high-fidelity mockups for the app',
                                'Align design with the wireframes',
                            ],
                            cover: { color: '', img: '' },

                            dueDate: '',
                        },
                        {
                            id: 'c103',
                            title: 'Design logo',
                            labels: [],
                            description: '',
                            checklists: [
                                {
                                    id: 'chk10136352',
                                    title: 'Design Process',
                                    items: [
                                        {
                                            id: 'item101',
                                            text: 'Gather requirements from the team',
                                            isChecked: true,
                                        },
                                        {
                                            id: 'item102',
                                            text: 'Create wireframe sketches',
                                            isChecked: false,
                                        },
                                        {
                                            id: 'item103',
                                            text: 'Design high-fidelity mockups',
                                            isChecked: false,
                                        },
                                    ],
                                },
                                {
                                    id: 'chk333102',
                                    title: 'Review Process',
                                    items: [
                                        {
                                            id: 'item201',
                                            text: 'Review mockups with the team',
                                            isChecked: false,
                                        },
                                        {
                                            id: 'item202',
                                            text: 'Make adjustments based on feedback',
                                            isChecked: false,
                                        },
                                    ],
                                },
                            ],
                            members: [],
                            attachments: '', // שדה attachments ריק
                            comments: [
                                'Design a logo for the Trello project',
                                'Ensure it aligns with the brand identity',
                            ],
                            cover: { color: '', img: '' },
                            dueDate: '',
                        },
                        {
                            id: 'c104',
                            title: 'Create color scheme',
                            labels: [],
                            description: '',
                            checklists: [],
                            members: [],
                            attachments: '', // שדה attachments ריק
                            comments: [
                                'Develop a color scheme for the app',
                                'Use brand colors as a base',
                            ],
                            cover: { color: '', img: '' },
                            dueDate: '',
                        },
                        {
                            id: 'c105',
                            title: 'Design icons',
                            labels: [],
                            description: '',
                            checklists: [],
                            members: [],
                            attachments: '', // שדה attachments ריק
                            comments: [
                                'Design custom icons for the Trello project',
                                'Ensure consistency with the overall design',
                            ],
                            cover: { color: '', img: '' },
                            dueDate: '',
                        },
                        {
                            id: 'c106',
                            title: 'Create typography',
                            labels: [],
                            description: '',
                            checklists: [],
                            members: [],
                            attachments: '', // שדה attachments ריק
                            comments: [
                                'Select fonts for the project',
                                'Ensure readability and aesthetic appeal',
                            ],
                            cover: { color: '', img: '' },
                            dueDate: '',
                        },
                        {
                            id: 'c107',
                            title: 'Develop design system',
                            labels: [],
                            description: '',
                            checklists: [],
                            members: [],
                            attachments: '', // שדה attachments ריק
                            comments: [
                                'Create a design system for the app',
                                'Include guidelines for all design elements',
                            ],
                            cover: { color: '', img: '' },
                            dueDate: '2024-09-30',
                        },
                        {
                            id: 'c108',
                            title: 'Review design with stakeholders',
                            labels: [],
                            description: '',
                            checklists: [],
                            members: [],
                            attachments: '', // שדה attachments ריק
                            comments: [
                                'Present the design to stakeholders',
                                'Incorporate their feedback into the design',
                            ],
                            cover: { color: '', img: '' },
                            dueDate: '',
                        },
                        {
                            id: 'c109',
                            title: 'Finalize design',
                            labels: [],
                            description: '',
                            checklists: [],
                            members: [],
                            attachments: '', // שדה attachments ריק
                            comments: [
                                'Finalize the design for the Trello project',
                                'Prepare for the development phase',
                            ],
                            cover: { color: '', img: '' },
                            dueDate: '2024-10-05',
                        },
                        {
                            id: 'c110',
                            title: 'Handoff design to developers',
                            labels: [],
                            description: '',
                            checklists: [],
                            members: [],
                            attachments: '', // שדה attachments ריק
                            comments: [
                                'Provide all design assets to the development team',
                                'Ensure clear communication during the handoff',
                            ],
                            cover: { color: '', img: '' },
                            dueDate: '',
                        },
                    ],
                    style: {},
                },
                {
                    id: 'g102',
                    title: 'Development Phase',
                    archivedAt: null,
                    tasks: [
                        {
                            id: 'c111',
                            title: 'Set up development environment',
                            labels: [],
                            description: '',
                            checklists: [],
                            members: [],
                            attachments: '', // שדה attachments ריק
                            comments: [
                                'Install all necessary tools',
                                'Ensure compatibility with the latest tech stack',
                            ],
                            cover: { color: '', img: '' },
                            dueDate: '2024-09-01',
                        },
                        {
                            id: 'c112',
                            title: 'Create project structure',
                            labels: [],
                            description: '',
                            checklists: [],
                            members: [],
                            attachments: '', // שדה attachments ריק
                            comments: [
                                'Set up the initial project structure',
                                'Follow best practices for maintainability',
                            ],
                            cover: { color: '', img: '' },
                            dueDate: '2024-09-05',
                        },
                    ],
                    style: {},
                },

                {
                    id: 'g103',
                    title: 'Testing Phase',
                    archivedAt: null,
                    tasks: [
                        {
                            id: 'c113',
                            title: 'Write unit tests',
                            labels: [],
                            description:
                                'Create unit tests for the core functionalities of the application.',
                            checklists: [],
                            members: [],
                            attachments: '', // שדה attachments ריק
                            comments: [
                                'Focus on critical paths',
                                'Ensure all edge cases are covered',
                            ],
                            cover: { color: '', img: '' },
                            dueDate: '2024-09-10',
                        },
                        {
                            id: 'c114',
                            title: 'Perform integration testing',
                            labels: [],
                            description:
                                'Test the integration of different modules to ensure they work together as expected.',
                            checklists: [],
                            members: [],
                            attachments: '', // שדה attachments ריק
                            comments: [
                                'Verify module interactions',
                                'Check for data consistency',
                            ],
                            cover: { color: '', img: '' },
                            dueDate: '2024-09-15',
                        },
                    ],
                },
                {
                    id: 'g104',
                    title: 'Deployment Phase',
                    archivedAt: null,
                    tasks: [
                        {
                            id: 'c115',
                            title: 'Prepare deployment environment',
                            labels: [],
                            description:
                                'Set up the environment for deployment, including server configurations and deployment scripts.',
                            checklists: [],
                            members: [],
                            attachments: '', // שדה attachments ריק
                            comments: [
                                'Ensure security configurations are in place',
                                'Test deployment scripts',
                            ],
                            cover: { color: '', img: '' },
                            dueDate: '2024-09-20',
                        },
                    ],
                },
            ],
            activities: [
                {
                    id: 'a112',
                    title: 'deleted list group-title',
                    type: 'deleteGroup',
                    createdAt: 154514,
                    byMember: {
                        id: 'u102',
                        fullname: 'Avi',
                        imgUrl: 'http://some-img',
                        color: '#f2d600',
                    },
                    group: {
                        id: 'g101',
                        title: 'Design Phase',
                    },
                },
                {
                    id: 'a111',
                    title: 'deleted card #4 from group-title',
                    type: 'deleteTask',
                    createdAt: 154514,
                    byMember: {
                        id: 'u102',
                        fullname: 'Avi',
                        imgUrl: 'http://some-img',
                        color: '#f2d600',
                    },
                    group: {
                        id: 'g101',
                        title: 'Design Phase',
                    },
                    task: {
                        id: 'c101',
                        title: 'Design wireframes',
                    },
                },
                {
                    id: 'a110',
                    title: 'removed checklist-title',
                    type: 'deleteChecklist',
                    createdAt: 154514,
                    byMember: {
                        id: 'u101',
                        fullname: 'Natia',
                        imgUrl: 'http://some-img',
                        color: '#61bd4f',
                    },
                    group: {
                        id: 'g101',
                        title: 'Design Phase',
                    },
                    task: {
                        id: 'c101',
                        title: 'Design wireframes',
                    },
                    checklist: {
                        id: 'ck101',
                        title: 'Design Process',
                    },
                },
                {
                    id: 'a109',
                    title: 'set task-title to be task-due-date',
                    type: 'setDueDate',
                    createdAt: 154514,
                    byMember: {
                        id: 'u103',
                        fullname: 'Yana',
                        imgUrl: 'http://some-img',
                        color: '#f3a600',
                    },
                    group: {
                        id: 'g101',
                        title: 'Design Phase',
                    },
                    task: {
                        id: 'c101',
                        title: 'Design wireframes',
                    },
                    dueDate: {
                        date: '2024-09-04',
                        time: '01:02',
                    },
                },
                {
                    id: 'a101',
                    title: 'complete checklist-item-text on task-title',
                    type: 'completeChecklistItem',
                    createdAt: 154514,
                    byMember: {
                        id: 'u101',
                        fullname: 'Natia',
                        imgUrl: 'http://some-img',
                        color: '#61bd4f',
                    },
                    group: {
                        id: 'g101',
                        title: 'Design Phase',
                    },
                    task: {
                        id: 'c101',
                        title: 'Design wireframes',
                    },
                    checklist: {
                        id: 'ck101',
                        title: 'Design Process',
                    },
                    item: {
                        id: 'item101',
                        text: 'Gather requirements from the team',
                    },
                },
                {
                    id: 'a102',
                    title: 'added checklistt-title to group-title',
                    type: 'addChecklist',
                    createdAt: 154520,
                    byMember: {
                        id: 'u102',
                        fullname: 'Avi',
                        imgUrl: 'http://some-img',
                        color: '#f2d600',
                    },
                    group: {
                        id: 'g101',
                        title: 'Design Phase',
                    },
                    task: {
                        id: 'c101',
                        title: 'Design wireframes',
                    },
                    checklist: {
                        id: 'chk101',
                        title: 'colors',
                    },
                },
                {
                    id: 'a104',
                    title: `added task-title to group-title`,
                    type: 'addTask',
                    createdAt: 154540,
                    byMember: {
                        id: 'u101',
                        fullname: 'Natia',
                        imgUrl: 'http://some-img',
                        color: '#61bd4f',
                    },
                    group: {
                        id: 'g101',
                        title: 'Design Phase',
                    },
                    task: {
                        id: 'c101',
                        title: 'Design wireframes',
                    },
                },
                {
                    id: 'a103',
                    title: `added group-title`,
                    type: 'addGroup',
                    createdAt: 154530,
                    byMember: {
                        id: 'u103',
                        fullname: 'Yana',
                        imgUrl: 'http://some-img',
                        color: '#f3a600',
                    },
                    group: {
                        id: 'g101',
                        title: 'Design Phase',
                    },
                    task: {
                        id: 'c101',
                        title: 'Design wireframes',
                    },
                },

                {
                    id: 'a108',
                    title: 'added this board to',
                    type: 'addBoard',
                    createdAt: Date.now(),
                    byMember: {
                        _id: 'u101',
                        fullname: 'Abi Abambi',
                        imgUrl: 'http://some-img',
                        color: '#000',
                    },
                    group: {
                        id: 'g101',
                        title: 'Design Phase',
                    },
                    task: {
                        id: 'c101',
                        title: 'Design wireframes',
                    },
                },
                {
                    id: 'a107',
                    title: 'created this board',
                    type: 'createBoard',
                    createdAt: Date.now(),
                    byMember: {
                        _id: 'u101',
                        fullname: 'Abi Abambi',
                        imgUrl: 'http://some-img',
                        color: '#000',
                    },
                    group: {
                        id: 'g101',
                        title: 'Design Phase',
                    },
                    task: {
                        id: 'c101',
                        title: 'Design wireframes',
                    },
                },
            ],
        },
    ]
}
