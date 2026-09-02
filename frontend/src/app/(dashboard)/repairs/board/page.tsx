"use client";

import { useState } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Wrench, CircleDashed, CheckCircle, CarFront, Clock, User2 } from "lucide-react";
import clsx from "clsx";

// Types
type JobStatus = "PENDING" | "ONGOING" | "COMPLETED" | "RELEASED";

interface JobOrder {
  id: string;
  jo_number: string;
  motorcycle: string;
  customer: string;
  mechanic: string;
  status: JobStatus;
  labor_charge: number;
}

// Mock Data
const INITIAL_DATA: Record<JobStatus, JobOrder[]> = {
  PENDING: [
    { id: "jo-1", jo_number: "JO-A1B2", motorcycle: "Yamaha MT-07", customer: "John Doe", mechanic: "Mike Smith", status: "PENDING", labor_charge: 150 },
    { id: "jo-2", jo_number: "JO-C3D4", motorcycle: "Honda CBR600RR", customer: "Jane Roe", mechanic: "Unassigned", status: "PENDING", labor_charge: 300 },
  ],
  ONGOING: [
    { id: "jo-3", jo_number: "JO-E5F6", motorcycle: "Kawasaki Ninja 400", customer: "Bob Lee", mechanic: "Dave Johnson", status: "ONGOING", labor_charge: 80 },
  ],
  COMPLETED: [
    { id: "jo-4", jo_number: "JO-G7H8", motorcycle: "Ducati Panigale V4", customer: "Alice Kim", mechanic: "Mike Smith", status: "COMPLETED", labor_charge: 500 },
  ],
  RELEASED: []
};

const COLUMNS: { id: JobStatus; title: string; icon: React.ReactNode; color: string }[] = [
  { id: "PENDING", title: "Pending", icon: <Clock className="w-5 h-5" />, color: "text-zinc-400 border-zinc-700" },
  { id: "ONGOING", title: "In Progress", icon: <Wrench className="w-5 h-5" />, color: "text-blue-400 border-blue-500/30" },
  { id: "COMPLETED", title: "Completed", icon: <CheckCircle className="w-5 h-5" />, color: "text-green-400 border-green-500/30" },
  { id: "RELEASED", title: "Released", icon: <CarFront className="w-5 h-5" />, color: "text-purple-400 border-purple-500/30" },
];

export default function RepairsKanban() {
  const [data, setData] = useState(INITIAL_DATA);

  const onDragEnd = (result: DropResult) => {
    const { source, destination } = result;
    if (!destination) return;

    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return;
    }

    const sourceStatus = source.droppableId as JobStatus;
    const destStatus = destination.droppableId as JobStatus;

    const sourceColumn = [...data[sourceStatus]];
    const destColumn = sourceStatus === destStatus ? sourceColumn : [...data[destStatus]];

    const [movedJob] = sourceColumn.splice(source.index, 1);
    movedJob.status = destStatus;
    
    destColumn.splice(destination.index, 0, movedJob);

    setData(prev => ({
      ...prev,
      [sourceStatus]: sourceColumn,
      [destStatus]: destColumn
    }));
    
    // Here we would trigger an API call to update the backend status:
    // apiClient.patch(`/repairs/jobs/${movedJob.id}/status`, { status: destStatus })
  };

  return (
    <div className="h-screen bg-zinc-950 p-8 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 z-10 relative">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-500">
            Repairs Board
          </h1>
          <p className="text-zinc-400 mt-1">Drag and drop to update job order status.</p>
        </div>
        <button className="bg-cyan-600 hover:bg-cyan-500 text-white px-6 py-2 rounded-lg font-medium transition-colors shadow-[0_0_15px_-3px_rgba(6,182,212,0.4)]">
          + New Job Order
        </button>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto pb-4">
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-6 h-full min-w-max items-start">
            {COLUMNS.map((col) => (
              <div key={col.id} className="w-[350px] flex flex-col h-full max-h-full">
                
                {/* Column Header */}
                <div className={clsx("flex items-center justify-between p-4 mb-4 rounded-xl border bg-zinc-900/50 backdrop-blur-md", col.color)}>
                  <div className="flex items-center gap-3 font-semibold">
                    {col.icon}
                    <span>{col.title}</span>
                  </div>
                  <span className="bg-zinc-800/80 px-2.5 py-0.5 rounded-full text-xs font-bold text-zinc-300">
                    {data[col.id].length}
                  </span>
                </div>

                {/* Droppable Area */}
                <Droppable droppableId={col.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={clsx(
                        "flex-1 overflow-y-auto p-2 rounded-2xl transition-colors border border-transparent",
                        snapshot.isDraggingOver ? "bg-white/5 border-white/10 border-dashed" : "bg-transparent"
                      )}
                    >
                      {data[col.id].map((job, index) => (
                        <Draggable key={job.id} draggableId={job.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={clsx(
                                "mb-4 bg-zinc-900/80 border border-white/10 rounded-xl p-5 hover:border-cyan-500/50 transition-colors shadow-lg backdrop-blur-md",
                                snapshot.isDragging && "shadow-[0_10px_30px_-10px_rgba(6,182,212,0.3)] border-cyan-500 rotate-2 scale-105 z-50 bg-zinc-800"
                              )}
                            >
                              <div className="flex justify-between items-start mb-3">
                                <span className="font-mono text-xs text-cyan-400 bg-cyan-950/50 px-2 py-1 rounded-md border border-cyan-500/20">
                                  {job.jo_number}
                                </span>
                                <span className="text-zinc-500 text-xs font-medium">Labor: ${job.labor_charge}</span>
                              </div>
                              
                              <h3 className="font-bold text-zinc-100 text-lg mb-1">{job.motorcycle}</h3>
                              <p className="text-zinc-400 text-sm mb-4">{job.customer}</p>
                              
                              <div className="flex items-center gap-2 pt-3 border-t border-white/5">
                                <div className="bg-zinc-800 p-1.5 rounded-full">
                                  <User2 className="w-3 h-3 text-zinc-300" />
                                </div>
                                <span className="text-xs text-zinc-300 font-medium">{job.mechanic}</span>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            ))}
          </div>
        </DragDropContext>
      </div>
    </div>
  );
}
