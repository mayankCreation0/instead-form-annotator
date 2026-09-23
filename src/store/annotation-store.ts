"use client";

import { create } from "zustand";
import templateFixture from "@/data/form-1040-template.json";
import dataFixture from "@/data/sample-return.json";
import {
  annotationTemplateSchema,
  DEFAULT_APPEARANCE,
  DEFAULT_FORMAT,
  type AnnotationField,
  type AnnotationTemplate,
} from "@/lib/schema/annotation-schema";

type WorkspaceMode = "annotate" | "preview" | "data";
type Snapshot = AnnotationTemplate["fields"];

type AnnotationState = {
  template: AnnotationTemplate;
  data: unknown;
  rawData: string;
  mode: WorkspaceMode;
  selectedFieldId: string | null;
  currentPage: number;
  zoom: number;
  showGrid: boolean;
  past: Snapshot[];
  future: Snapshot[];
  hydrated: boolean;
  setMode: (mode: WorkspaceMode) => void;
  setCurrentPage: (page: number) => void;
  setZoom: (zoom: number) => void;
  toggleGrid: () => void;
  selectField: (id: string | null) => void;
  setDocument: (form: AnnotationTemplate["form"]) => void;
  updatePageCount: (pageCount: number) => void;
  addField: (page: number, rect: AnnotationField["rect"]) => void;
  updateField: (id: string, patch: Partial<AnnotationField>) => void;
  removeField: (id: string) => void;
  duplicateField: (id: string) => void;
  setRawData: (raw: string) => { ok: boolean; error?: string };
  importTemplate: (value: unknown) => { ok: boolean; error?: string };
  resetSample: () => void;
  undo: () => void;
  redo: () => void;
  markHydrated: () => void;
};

const initialTemplate = annotationTemplateSchema.parse(templateFixture);
const initialRawData = JSON.stringify(dataFixture, null, 2);

function cloneFields(fields: AnnotationField[]): AnnotationField[] {
  return structuredClone(fields);
}

function withHistory(
  state: AnnotationState,
  fields: AnnotationField[],
): Pick<AnnotationState, "template" | "past" | "future"> {
  return {
    template: {
      ...state.template,
      fields,
      updatedAt: new Date().toISOString(),
    },
    past: [...state.past.slice(-29), cloneFields(state.template.fields)],
    future: [],
  };
}

export const useAnnotationStore = create<AnnotationState>((set) => ({
  template: initialTemplate,
  data: dataFixture,
  rawData: initialRawData,
  mode: "annotate",
  selectedFieldId: initialTemplate.fields[0]?.id ?? null,
  currentPage: 1,
  zoom: 1,
  showGrid: false,
  past: [],
  future: [],
  hydrated: false,
  setMode: (mode) => set({ mode }),
  setCurrentPage: (currentPage) => set({ currentPage, selectedFieldId: null }),
  setZoom: (zoom) => set({ zoom: Math.min(2, Math.max(0.6, zoom)) }),
  toggleGrid: () => set((state) => ({ showGrid: !state.showGrid })),
  selectField: (selectedFieldId) => set({ selectedFieldId }),
  setDocument: (form) =>
    set((state) => ({
      template: {
        ...state.template,
        form,
        fields: [],
        updatedAt: new Date().toISOString(),
      },
      currentPage: 1,
      selectedFieldId: null,
      past: [],
      future: [],
    })),
  updatePageCount: (pageCount) =>
    set((state) => ({
      template: {
        ...state.template,
        form: { ...state.template.form, pageCount },
      },
    })),
  addField: (page, rect) =>
    set((state) => {
      const id = `field-${crypto.randomUUID().slice(0, 8)}`;
      const next: AnnotationField = {
        id,
        name: `Untitled field ${state.template.fields.length + 1}`,
        page,
        rect,
        type: "text",
        binding: { pointer: "/taxpayer/name/first", fallback: "" },
        format: { ...DEFAULT_FORMAT },
        appearance: { ...DEFAULT_APPEARANCE },
        required: false,
        hidden: false,
      };
      return {
        ...withHistory(state, [...state.template.fields, next]),
        selectedFieldId: id,
      };
    }),
  updateField: (id, patch) =>
    set((state) => {
      const fields = state.template.fields.map((field) =>
        field.id === id ? { ...field, ...patch } : field,
      );
      return withHistory(state, fields);
    }),
  removeField: (id) =>
    set((state) => ({
      ...withHistory(
        state,
        state.template.fields.filter((field) => field.id !== id),
      ),
      selectedFieldId: state.selectedFieldId === id ? null : state.selectedFieldId,
    })),
  duplicateField: (id) =>
    set((state) => {
      const source = state.template.fields.find((field) => field.id === id);
      if (!source) return {};
      const copy = structuredClone(source);
      copy.id = `field-${crypto.randomUUID().slice(0, 8)}`;
      copy.name = `${copy.name} copy`;
      copy.rect.x = Math.min(0.96, copy.rect.x + 0.015);
      copy.rect.y = Math.min(0.96, copy.rect.y + 0.015);
      return {
        ...withHistory(state, [...state.template.fields, copy]),
        selectedFieldId: copy.id,
      };
    }),
  setRawData: (rawData) => {
    try {
      const data = JSON.parse(rawData);
      set({ data, rawData });
      return { ok: true };
    } catch (error) {
      set({ rawData });
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Invalid JSON",
      };
    }
  },
  importTemplate: (value) => {
    const result = annotationTemplateSchema.safeParse(value);
    if (!result.success) {
      return { ok: false, error: result.error.issues[0]?.message };
    }
    set({
      template: result.data,
      selectedFieldId: result.data.fields[0]?.id ?? null,
      currentPage: 1,
      past: [],
      future: [],
    });
    return { ok: true };
  },
  resetSample: () =>
    set({
      template: structuredClone(initialTemplate),
      data: structuredClone(dataFixture),
      rawData: initialRawData,
      selectedFieldId: initialTemplate.fields[0]?.id ?? null,
      currentPage: 1,
      mode: "annotate",
      past: [],
      future: [],
    }),
  undo: () =>
    set((state) => {
      const previous = state.past.at(-1);
      if (!previous) return {};
      return {
        template: { ...state.template, fields: cloneFields(previous) },
        past: state.past.slice(0, -1),
        future: [cloneFields(state.template.fields), ...state.future.slice(0, 29)],
      };
    }),
  redo: () =>
    set((state) => {
      const next = state.future[0];
      if (!next) return {};
      return {
        template: { ...state.template, fields: cloneFields(next) },
        past: [...state.past, cloneFields(state.template.fields)],
        future: state.future.slice(1),
      };
    }),
  markHydrated: () => set({ hydrated: true }),
}));

export function persistWorkspace(): void {
  if (typeof window === "undefined") return;
  const state = useAnnotationStore.getState();
  localStorage.setItem(
    "form-studio:v1",
    JSON.stringify({
      template: state.template,
      data: state.data,
      showGrid: state.showGrid,
      zoom: state.zoom,
    }),
  );
}

export function hydrateWorkspace(): void {
  if (typeof window === "undefined") return;
  const raw = localStorage.getItem("form-studio:v1");
  if (!raw) {
    useAnnotationStore.getState().markHydrated();
    return;
  }
  try {
    const stored = JSON.parse(raw) as {
      template: unknown;
      data: unknown;
      showGrid?: boolean;
      zoom?: number;
    };
    const parsed = annotationTemplateSchema.parse(stored.template);
    useAnnotationStore.setState({
      template: parsed,
      data: stored.data,
      rawData: JSON.stringify(stored.data, null, 2),
      showGrid: stored.showGrid ?? false,
      zoom: stored.zoom ?? 1,
      hydrated: true,
      selectedFieldId: parsed.fields[0]?.id ?? null,
    });
  } catch {
    localStorage.removeItem("form-studio:v1");
    useAnnotationStore.getState().markHydrated();
  }
}
