export type TBrandHistoryItem = {
    year: number;
    html: string | HTMLElement;
}

export interface IBrandHistoryElements {
    items: Array<TBrandHistoryItem>;
}