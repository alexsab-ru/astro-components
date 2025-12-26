export type TBrandHistoryItem = {
    year: number | string;
    html: string | HTMLElement;
}

export interface IBrandHistoryElements {
    items: Array<TBrandHistoryItem>;
}
