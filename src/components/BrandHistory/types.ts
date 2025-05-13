export type TBrandHistoryItem = {
    year: number;
    html: string | HTMLElement;
}

export interface IBrandHistory {
    items: Array<TBrandHistoryItem>;
}