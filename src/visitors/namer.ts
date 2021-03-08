/** Type describe a function that formulates hierarchical names. */
export type Namer = (parent: string, child: string) => string;
