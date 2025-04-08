import { CategoryLikeTreeElement } from './categoryLikeTreeElement';
import type { LhqModelCategory } from '../api/schemas';
import type { ICategoryElement, ICategoryLikeTreeElement, IRootModelElement } from '../api/modelTypes';

export class CategoryElement extends CategoryLikeTreeElement<LhqModelCategory> implements ICategoryElement {
    constructor(root: IRootModelElement, name: string, parent: ICategoryLikeTreeElement | undefined) {
        super(root, 'category', name, parent);
    }

    public populate(source: LhqModelCategory | undefined): void {
        if (source) {
            this._description = source.description;
        }

        super.populate(source);
    }

    protected bindToModel(model: Partial<LhqModelCategory>): void {
        super.bindToModel(model);
        model.description = this._description;
    }

    protected createCategory(root: IRootModelElement, name: string, parent: ICategoryLikeTreeElement | undefined): CategoryLikeTreeElement {
        return new CategoryElement(root, name, parent);
    }
}
