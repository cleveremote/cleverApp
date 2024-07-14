

export const loadModules = (sequence: any) => {
    return sequence?.modules || [];
}

export const updateModule = (prevModules: any, module: any) => {
    console.log("updateModule",module);
    const previous = [...prevModules];
    if (module) {
        const moduleDto = { id: module.portNum, portNum: module.portNum, isModified: module.isModified };
        const deleteId = moduleDto?.id.split('_');
        const index = previous.findIndex(x => x.id === (deleteId[1] || moduleDto?.id))
        if (index > -1) {
            previous[index] = moduleDto;
        } else {
            previous.push(moduleDto);
        }
    }
    console.log("updateModule",previous);
    return previous;
}
