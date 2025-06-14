// Recipe Sign-Up Form JavaScript
class RecipeSignupForm {
    constructor() {
        this.members = [];
        this.recipes = [];
        this.isLoading = false;
        
        this.initializeForm();
        this.loadData();
    }
    
    initializeForm() {
        // Get form elements
        this.form = document.getElementById('recipeForm');
        this.memberSelect = document.getElementById('member');
        this.cookingRadios = document.querySelectorAll('input[name="cooking"]');
        this.recipeSelect = document.getElementById('recipe');
        this.recipeGroup = document.getElementById('recipeGroup');
        this.recipeEntry = document.getElementById('recipeEntry');
        this.submitBtn = document.getElementById('submitBtn');
        this.messageDiv = document.getElementById('message');
        this.notesField = document.getElementById('notes');
        
        // Add event listeners
        this.cookingRadios.forEach(radio => {
            radio.addEventListener('change', () => this.handleCookingChange());
        });
        this.recipeSelect.addEventListener('change', () => this.handleRecipeChange());
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        this.memberSelect.addEventListener('change', () => this.validateForm());
        
        // Set event name
        document.getElementById('eventName').value = CONFIG.EVENT.name;
    }
    
    async loadData() {
        this.showMessage('Loading data...', 'info');
        
        try {
            // Load real data from Google Sheets
            await this.loadFromGoogleSheets();
            
            this.populateMemberDropdown();
            this.populateRecipeDropdown();
            
            this.hideMessage();
        } catch (error) {
            console.error('Error loading data:', error);
            this.showMessage('Error loading data. Using sample data.', 'error');
            // Fallback to sample data if Google Sheets fails
            await this.loadSampleData();
            this.populateMemberDropdown();
            this.populateRecipeDropdown();
            this.hideMessage();
        }
    }
    
    async loadSampleData() {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        this.members = CONFIG.SAMPLE_MEMBERS.filter(member => member.active);
        this.recipes = CONFIG.SAMPLE_RECIPES.filter(recipe => !recipe.claimed);
    }
    
    async loadFromGoogleSheets() {
        if (!CONFIG.SCRIPT_URL) {
            throw new Error('Google Apps Script URL not configured');
        }
        
        try {
            const url = `${CONFIG.SCRIPT_URL}?action=getData&cb=${Date.now()}`;
            console.log('🔄 Fetching data from:', url);

            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            // 1. Log the raw response
            const raw = await response.json();
            console.log('🚀 raw payload:', raw);
            
            // Check if the response indicates success
            if (!raw.success) {
                throw new Error(raw.message || 'API returned error');
            }
            
            // 2. Guard against unexpected shapes
            if (!raw.data || !Array.isArray(raw.data.members) || !Array.isArray(raw.data.recipes)) {
                console.error('❌ Unexpected payload shape. Expected: {success: true, data: {members: [], recipes: []}}');
                console.error('❌ Received:', raw);
                throw new Error('Unexpected payload shape');
            }
            
            // 3. Destructure the nested data envelope
            const { members, recipes } = raw.data;
            
            console.log('📊 Members found:', members.length);
            console.log('🍽️ Recipes found:', recipes.length);
            
            // 4. Filter the clean arrays
            const activeMembers = members.filter(m => m.active);
            const availableRecipes = recipes.filter(r => !r.claimed);
            
            console.log('✅ Active members:', activeMembers.length);
            console.log('🆓 Available recipes:', availableRecipes.length);
            
            this.members = activeMembers;
            this.recipes = availableRecipes;
            
            if (this.members.length === 0) {
                throw new Error('No active members found');
            }
            
            if (this.recipes.length === 0) {
                console.warn('⚠️ No available recipes found - all may be claimed');
            }
            
        } catch (error) {
            console.error('❌ Error fetching from Google Sheets:', error);
            throw error;
        }
    }
    
    populateMemberDropdown() {
        // Clear existing options except the first one
        this.memberSelect.innerHTML = '<option value="">Select your name...</option>';
        
        this.members.forEach(member => {
            const option = document.createElement('option');
            option.value = member.discordId;
            option.textContent = member.displayName;
            this.memberSelect.appendChild(option);
        });
        
        console.log('👥 Populated member dropdown with', this.members.length, 'members');
    }
    
    populateRecipeDropdown() {
        // Clear existing options except the first one
        this.recipeSelect.innerHTML = '<option value="">Select a recipe...</option>';
        
        if (this.recipes.length === 0) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'No recipes available';
            option.disabled = true;
            this.recipeSelect.appendChild(option);
            return;
        }
        
        this.recipes.forEach(recipe => {
            const option = document.createElement('option');
            option.value = recipe.id;
            option.textContent = recipe.name;
            this.recipeSelect.appendChild(option);
        });
        
        console.log('🍽️ Populated recipe dropdown with', this.recipes.length, 'recipes');
    }

    getCookingValue() {
        const checked = document.querySelector('input[name="cooking"]:checked');
        return checked ? checked.value : '';
    }

    handleCookingChange() {
        const value = this.getCookingValue();
        this.cookingRadios.forEach(radio => {
            if (radio.checked) {
                radio.parentElement.classList.add('selected');
            } else {
                radio.parentElement.classList.remove('selected');
            }
        });
        const isCooking = value === 'yes';
        
        if (isCooking) {
            this.recipeGroup.style.display = 'block';
            this.recipeSelect.required = true;
        } else {
            this.recipeGroup.style.display = 'none';
            this.recipeSelect.required = false;
            this.recipeSelect.value = '';
            this.recipeEntry.style.display = 'none';
            this.recipeEntry.innerHTML = '';
        }
        
        this.validateForm();
    }
    
    handleRecipeChange() {
        const selectedRecipeId = parseInt(this.recipeSelect.value);

        if (selectedRecipeId) {
            const recipe = this.recipes.find(r => r.id === selectedRecipeId);
            if (recipe) {
                this.renderRecipeEntry(recipe);
                this.recipeEntry.style.display = 'block';
            }
        } else {
            this.recipeEntry.style.display = 'none';
            this.recipeEntry.innerHTML = '';
        }

        this.validateForm();
    }

    renderRecipeEntry(recipe) {
        const entry = document.createElement('div');
        entry.className = 'recipe-entry';

        // Title
        const title = document.createElement('div');
        title.className = 'title';
        title.textContent = recipe.name || '';
        entry.appendChild(title);

        // Page
        if (recipe.page) {
            const row = document.createElement('div');
            row.className = 'meta-row';

            const label = document.createElement('span');
            label.className = 'label';
            label.textContent = 'Page';
            row.appendChild(label);

            const pill = document.createElement('span');
            pill.className = 'pill neutral';
            pill.textContent = recipe.page;
            row.appendChild(pill);

            entry.appendChild(row);
        }

        // Categories
        let categories = recipe.categories;
        if (typeof categories === 'string') {
            categories = categories.split(/[,;]+/).map(c => c.trim()).filter(Boolean);
        }
        if (Array.isArray(categories) && categories.length) {
            const row = document.createElement('div');
            row.className = 'meta-row';

            const label = document.createElement('span');
            label.className = 'label';
            label.textContent = 'Categories';
            row.appendChild(label);

            categories.forEach((cat, idx) => {
                const pill = document.createElement('span');
                pill.className = 'pill ' + (idx % 2 === 0 ? 'pink' : 'blue');
                pill.textContent = cat;
                row.appendChild(pill);
            });

            entry.appendChild(row);
        }

        // Ingredients
        let ingredientsText = recipe.ingredients;
        if (Array.isArray(ingredientsText)) {
            ingredientsText = ingredientsText.join('; ');
        }
        if (ingredientsText) {
            const row = document.createElement('div');
            row.className = 'meta-row ingredients';

            const label = document.createElement('span');
            label.className = 'label';
            label.textContent = 'Ingredients';
            row.appendChild(label);

            const textSpan = document.createElement('span');
            textSpan.id = 'ingredient-text';
            textSpan.className = 'ingredient-text collapsed';
            textSpan.textContent = ingredientsText;
            row.appendChild(textSpan);

            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'toggle-button';
            button.setAttribute('aria-expanded', 'false');
            button.setAttribute('aria-controls', 'ingredient-text');
            button.textContent = 'Show more';
            button.addEventListener('click', () => toggleIngredientText());
            row.appendChild(button);

            entry.appendChild(row);
        }

        this.recipeEntry.innerHTML = '';
        this.recipeEntry.appendChild(entry);
    }
    
    validateForm() {
        const memberSelected = this.memberSelect.value !== '';
        const cookingValue = this.getCookingValue();
        const cookingSelected = cookingValue !== '';
        const recipeSelected = cookingValue === 'no' || this.recipeSelect.value !== '';
        
        const isValid = memberSelected && cookingSelected && recipeSelected;
        this.submitBtn.disabled = !isValid;
        
        return isValid;
    }
    
    async handleSubmit(event) {
        event.preventDefault();
        
        if (!this.validateForm() || this.isLoading) {
            return;
        }
        
        this.isLoading = true;
        this.setLoadingState(true);
        
        try {
            const formData = this.getFormData();
            console.log('📤 Submitting form data:', formData);
            
            // Submit to Google Apps Script
            await this.submitToGoogleSheets(formData);
            
            this.showMessage(CONFIG.MESSAGES.SUCCESS, 'success');
            this.resetForm();
            
            // Reload data to get updated recipe list
            await this.loadData();
            
        } catch (error) {
            console.error('❌ Submission error:', error);
            
            if (error.message.includes('duplicate')) {
                this.showMessage(CONFIG.MESSAGES.DUPLICATE, 'error');
            } else {
                this.showMessage(CONFIG.MESSAGES.ERROR, 'error');
            }
        } finally {
            this.isLoading = false;
            this.setLoadingState(false);
        }
    }
    
    getFormData() {
        const discordId = this.memberSelect.value;
        const member = this.members.find(m => m.discordId === discordId);
        
        const cookingValue = this.getCookingValue();
        const formData = {
            eventName: document.getElementById('eventName').value,
            discordId: discordId,
            displayName: member ? member.displayName : '',
            cooking: cookingValue === 'yes',
            recipeId: cookingValue === 'yes' ? parseInt(this.recipeSelect.value) : null,
            recipeName: '',
            notes: this.notesField.value.trim(),
            timestamp: new Date().toISOString()
        };
        
        if (formData.recipeId) {
            const recipe = this.recipes.find(r => r.id === formData.recipeId);
            formData.recipeName = recipe ? recipe.name : '';
        }
        
        return formData;
    }

    async submitToGoogleSheets(formData) {
      if (!CONFIG.SCRIPT_URL) {
        throw new Error('Google Apps Script URL not configured');
      }
      
      console.log('📡 Submitting to Google Apps Script...');
      
      // Create form data (no JSON, no custom headers = no CORS preflight)
      const formBody = new URLSearchParams();
      formBody.append('action', 'submitRSVP');
      formBody.append('data', JSON.stringify(formData));
      
      const response = await fetch(CONFIG.SCRIPT_URL, {
        method: 'POST',
        body: formBody  // No headers = simple request
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('📥 Submission result:', result);
      
      if (!result.success) {
        throw new Error(result.error || result.message || 'Submission failed');
      }
      
      return result;
    }


    
    // async submitToGoogleSheets(formData) {
    //     if (!CONFIG.SCRIPT_URL) {
    //         throw new Error('Google Apps Script URL not configured');
    //     }
        
    //     console.log('📡 Submitting to Google Apps Script...');
        
    //     const response = await fetch(CONFIG.SCRIPT_URL, {
    //         method: 'POST',
    //         headers: {
    //             'Content-Type': 'application/json',
    //         },
    //         body: JSON.stringify({
    //             action: 'submitRSVP',
    //             data: formData
    //         })
    //     });
        
    //     if (!response.ok) {
    //         throw new Error(`HTTP error! status: ${response.status}`);
    //     }
        
    //     const result = await response.json();
    //     console.log('📥 Submission result:', result);
        
    //     if (!result.success) {
    //         throw new Error(result.error || result.message || 'Submission failed');
    //     }
        
    //     return result;
    // }
    
    setLoadingState(loading) {
        const btnText = this.submitBtn.querySelector('.btn-text');
        const btnLoading = this.submitBtn.querySelector('.btn-loading');
        
        if (loading) {
            btnText.style.display = 'none';
            btnLoading.style.display = 'inline';
            this.submitBtn.disabled = true;
            this.submitBtn.classList.add('loading');
        } else {
            btnText.style.display = 'inline';
            btnLoading.style.display = 'none';
            this.submitBtn.classList.remove('loading');
            this.validateForm(); // Re-enable if form is valid
        }
    }
    
    showMessage(text, type) {
        this.messageDiv.textContent = text;
        this.messageDiv.className = `message ${type}`;
        this.messageDiv.style.display = 'block';
        
        // Auto-hide success messages after 5 seconds
        if (type === 'success') {
            setTimeout(() => {
                this.hideMessage();
            }, 5000);
        }
    }
    
    hideMessage() {
        this.messageDiv.style.display = 'none';
        this.messageDiv.className = 'message';
    }
    
    resetForm() {
        this.form.reset();
        this.recipeGroup.style.display = 'none';
        this.recipeEntry.style.display = 'none';
        this.recipeEntry.innerHTML = '';
        this.recipeSelect.required = false;
        this.submitBtn.disabled = true;
        this.cookingRadios.forEach(r => r.parentElement.classList.remove('selected'));
        if (this.notesField) this.notesField.value = '';
        document.getElementById('eventName').value = CONFIG.EVENT.name;
    }
}

// Initialize the form when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new RecipeSignupForm();
});

function toggleIngredientText() {
    const text = document.getElementById('ingredient-text');
    const button = document.querySelector('.toggle-button');
    if (!text || !button) return;
    const expanded = text.classList.toggle('expanded');
    if (expanded) {
        text.classList.remove('collapsed');
    } else {
        text.classList.add('collapsed');
    }
    button.textContent = expanded ? 'Show less' : 'Show more';
    button.setAttribute('aria-expanded', expanded);
}

