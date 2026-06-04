import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

type initialStateType = {
    ProjectDelete: string | null 
}

const initialState:initialStateType = {
    ProjectDelete: null
}

const GlobalModalSlice = createSlice({
    name:"GlobalModal",
    initialState,
    reducers:{
        setProjectDelete: (state, payload:PayloadAction<string | null>)=>{
            state.ProjectDelete = payload.payload
            return state;
        }
    }
})

export const {setProjectDelete} = GlobalModalSlice.actions;
export default GlobalModalSlice.reducer;