import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

type initialStateType = {
    projects:project[]
    personaDialog: boolean
}

const initialState:initialStateType = {
    projects:[],
    personaDialog: false
}

const ProjectSlice = createSlice({
    name:"ProjectSlice",
    initialState,
    reducers:{
        setProjects: (state, action:PayloadAction<project[]>)=>{
            state.projects = action.payload
        },
        setPersonaDialog:(state, action:PayloadAction<boolean>)=>{
            state.personaDialog = action.payload
        }
    }
});

export const {setProjects, setPersonaDialog} = ProjectSlice.actions;
export default ProjectSlice.reducer;