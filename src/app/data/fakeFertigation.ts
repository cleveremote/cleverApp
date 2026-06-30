// Fake data used to validate the Fertigation task/cycle structure and visuals
// without a backend connection. Mirrors the configuration shape returned by
// `front/box/fetch/configuration` (tasks + cycles linked via `taskId`).

export const fakeFertigationTasks = [
	{
		id: 'task-mixage-pompage',
		name: 'Mixage et pompage',
		description: 'Active le mixeur et la pompe ensemble',
		mapSectionId: 'section-1',
		style: {
			bgColor: '#2196F3',
			fontColor: '#FFFFFF',
			iconColor: '#FFFFFF'
		},
		schedules: [],
		triggers: []
	}
];

export const fakeFertigationCycles = [
	{
		id: 'cycle-mixer',
		name: 'Mixer',
		type: 'CYCLE',
		description: 'Cycle du mixeur',
		mapSectionId: 'section-1',
		taskId: 'task-mixage-pompage',
		style: {bgColor: '#4CAF50', fontColor: '#FFFFFF', iconColor: '#FFFFFF'},
		modePriority: [
			{mode: 'MANUAL', priority: 0},
			{mode: 'SCHEDULE', priority: 1},
			{mode: 'TRIGGER', priority: 2}
		],
		sequences: [
			{
				id: 'seq-mixer-1',
				name: 'Mixage',
				description: 'Sequence de mixage',
				mapSectionId: 'section-1',
				maxDuration: 60000,
				vfd: 0,
				taskId: '',
				modules: [{id: '12', portNum: '12'}],
				conditions: []
			}
		],
		schedules: [],
		triggers: []
	},
	{
		id: 'cycle-pump',
		name: 'Pump',
		type: 'CYCLE',
		description: 'Cycle de la pompe',
		mapSectionId: 'section-1',
		taskId: 'task-mixage-pompage',
		style: {bgColor: '#FF9800', fontColor: '#FFFFFF', iconColor: '#FFFFFF'},
		modePriority: [
			{mode: 'MANUAL', priority: 0},
			{mode: 'SCHEDULE', priority: 1},
			{mode: 'TRIGGER', priority: 2}
		],
		sequences: [
			{
				id: 'seq-pump-1',
				name: 'Pompage',
				description: 'Sequence de pompage',
				mapSectionId: 'section-1',
				maxDuration: 120000,
				vfd: 0,
				taskId: '',
				modules: [{id: '13', portNum: '13'}],
				conditions: []
			}
		],
		schedules: [],
		triggers: []
	}
];
