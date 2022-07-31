

export const updateConfiguration = (currentConfiguration:any,status:any) => {
    const  test = JSON.parse(JSON.stringify(currentConfiguration));
    test[0].name = '1234';

    return test;
}

export const getProcesses = (configuration: string)  => {
    const processes = [];
    if (configuration) {
        const objConfig = JSON.parse(configuration);

        objConfig.cycles.forEach(cycle => {
            processes.push({
                id: cycle.id,
                name: cycle.name,
                duration: 'cycle.duration',
                style: cycle.style
            });
        });
    }

    return processes;
}