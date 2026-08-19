/**
 * ColorGradientManager - Advanced color gradient system
 */

class ColorGradientManager {
    constructor() {
        this.customGradients = new Map();
    }

    createGradient(name, colors) {
        this.customGradients.set(name, { colors, createdAt: Date.now() });
    }

    getGradient(name) {
        return this.customGradients.get(name);
    }

    deleteGradient(name) {
        return this.customGradients.delete(name);
    }

    getAllGradients() {
        return Array.from(this.customGradients.entries());
    }

    saveToDatabase(db) {
        db.set('colorGradientManager', JSON.stringify(Array.from(this.customGradients.entries())));
    }

    loadFromDatabase(db) {
        try {
            const data = JSON.parse(db.get('colorGradientManager') || '[]');
            this.customGradients = new Map(data);
            return true;
        } catch (error) {
            return false;
        }
    }
}

export default ColorGradientManager;
