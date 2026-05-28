import { combineReducers, configureStore } from "@reduxjs/toolkit";
import ProjectReducer from './ProjectSlice'

const rootReducer = combineReducers({
  Project: ProjectReducer
});


export const store = configureStore({
  reducer: rootReducer,
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
