class ActionReducers {
    constructor() {
        this.combinedReducers   = [];
        this.reducers           = {};
        this.actions            = {};
    }
    createReducer(name, reducer) {
        name = transformReducerName(name);
        if(name in this.reducers)           throw `Reducer named '${name}' already exists.`;
        if(typeof reducer != 'function')    throw `Reducer '${name}' is not a function.`
        this.reducers[name] = reducer;
    }
    addCombinedReducer(type, name, reducer, defaultValue) {
        this.combinedReducers.push({ type: transformReducerName(type), name, reducer, defaultValue });
    }
    createAction(name, action = data => Object.assign({}, data)) {
        if(name in this.actions)            throw `Action named '${name}' already exists.`;
        if(typeof action  != 'function')    throw `Action '${name}' is not a function.`
        this.actions[name] = action;
    }
    get reducer() {
        return this.runReducer.bind(this)
    }
    runReducer(state, action) {
        let draft = clone(state);
        if(draft == null && this.combinedReducers.length > 0)
            draft = {};
        for(let comb of this.combinedReducers) {
            if(action.type == comb.type) {
                draft[comb.name] = comb.reducer(action);
            } else {
                draft[comb.name] = draft[comb.name] == null
                    ? typeof comb.defaultValue == 'function'
                        ? comb.defaultValue(draft[comb.name])
                        : comb.defaultValue
                    : draft[comb.name];
            }
        }
        if(!(action.type in this.reducers)) return draft;
        let ret = this.reducers[action.type](draft, action);
        if(ret == null) return draft;
        return ret
    }
}

const ar = new ActionReducers();

const dispatcher = next => async (name, ...data) => {
    let response;
    if(name in ar.actions) {
        response = await treatResponse(next, name, await ar.actions[name](...data));
    } else {
        response = name;
    }
    if(response != null) next(response)
};

const treatResponse = async (next, name, response) => {
    if(typeof response == 'function') {
        return await treatResponse(next, name, response( dispatcher(next) ));
    } else if(typeof response == 'object' && response.constructor == Promise) {
        return await treatResponse(next, name, await response);
    } else {
        return Object.assign({}, {type: transformReducerName(name)}, response)
    }
}

export default function(...addActionReducers) {
    for(let func of addActionReducers) func(ar);
    return {
        middleware: () => dispatcher,
        reducer:    ar.reducer,
        actions:    ar.actions,
        object:     ar
    }
}

function clone(obj){
    if(obj===null || typeof obj !== "object")
        return obj;

    if(obj instanceof Date)
        return new Date(obj.getTime());

    if(Array.isArray(obj))
        return obj.slice(0);

    let clonedObj = new obj.constructor();
    for(var prop in obj){
        if(obj.hasOwnProperty(prop)){
            clonedObj[prop] = clone(obj[prop]);
        }
    }
    return clonedObj;
}

function transformReducerName(name) {
    return name.toUpperCase()
}
