import { afterNextRender, Component, ElementRef, inject, Injector, OnInit, signal, viewChild, viewChildren } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import { LucideAngularModule } from 'lucide-angular'
import { firstValueFrom } from 'rxjs'
import { DishStore } from '../../store/dish.store'
import { DishService } from '../../services/dish.service'
import { IngredientStore } from '../../../ingredients/store/ingredient.store'
import type { CreateDishDto, DishCategory } from '../../models/dish.model'

@Component({
  selector: 'app-dish-form',
  standalone: true,
  imports: [FormsModule, RouterLink, LucideAngularModule],
  templateUrl: './dish-form.component.html',
  styleUrl: './dish-form.component.css'
})
export class DishFormComponent implements OnInit {
  private readonly store = inject(DishStore)
  private readonly service = inject(DishService)
  readonly ingredientStore = inject(IngredientStore)
  private readonly route = inject(ActivatedRoute)
  private readonly router = inject(Router)
  private readonly injector = inject(Injector)

  private readonly ingredientSelect = viewChild.required<ElementRef<HTMLSelectElement>>('ingredientSelect')
  private readonly removeButtons = viewChildren<ElementRef<HTMLButtonElement>>('removeButton')

  isEditing = false
  dishId: string | null = null
  restaurantId: string = ''
  loading = signal(false)
  error = signal<string | null>(null)

  categories: DishCategory[] = ['entrante', 'principal', 'postre', 'bebida']

  form: CreateDishDto = {
    name: '',
    description: null,
    price: 0,
    category: 'principal',
    available: true,
    ingredients: []
  }

  newIngredientId = ''
  newIngredientQty = 1
  ingredientError = signal<string | null>(null)
  /** Mensaje para lectores de pantalla (región aria-live). */
  announcement = signal('')

  get pageTitle(): string {
    return this.isEditing ? 'Editar plato' : 'Nuevo plato'
  }

  get listUrl(): string {
    return `/restaurants/${this.restaurantId}/dishes`
  }

  getCategoryLabel(category: string): string {
    const labels: Record<string, string> = {
      'entrante': 'Entrante',
      'principal': 'Principal',
      'postre': 'Postre',
      'bebida': 'Bebida'
    }
    return labels[category] ?? category
  }

  ngOnInit(): void {
    this.restaurantId = this.route.parent?.snapshot.params['restaurantId'] ?? ''
    const id = this.route.snapshot.paramMap.get('id')

    if (this.restaurantId) {
      this.ingredientStore.loadByRestaurant(this.restaurantId)
    }

    if (id && this.restaurantId) {
      this.isEditing = true
      this.dishId = id
      this.loadDish()
    }
  }

  private async loadDish(): Promise<void> {
    this.loading.set(true)
    try {
      const dish = await firstValueFrom(this.service.getById(this.restaurantId, this.dishId!))
      this.form = {
        name: dish.name,
        description: dish.description,
        price: dish.price,
        category: dish.category,
        available: dish.available,
        ingredients: [...dish.ingredients]
      }
    } catch {
      this.error.set('No se pudo cargar el plato.')
    } finally {
      this.loading.set(false)
    }
  }

  /** Enter en la cantidad añade el ingrediente en lugar de enviar el formulario. */
  onQuantityEnter(event: Event): void {
    event.preventDefault()
    this.addIngredient()
  }

  addIngredient(): void {
    const error = this.validateNewIngredient()
    this.ingredientError.set(error)
    if (error) {
      this.announcement.set(error)
      return
    }

    this.form.ingredients = [
      ...this.form.ingredients,
      { ingredientId: this.newIngredientId, quantity: this.newIngredientQty }
    ]
    this.announcement.set(`${this.getIngredientName(this.newIngredientId)} añadido`)
    this.newIngredientId = ''
    this.newIngredientQty = 1
    // El foco vuelve al selector para poder añadir otro ingrediente.
    this.ingredientSelect().nativeElement.focus()
  }

  removeIngredient(ingredientId: string): void {
    const index = this.form.ingredients.findIndex(i => i.ingredientId === ingredientId)
    this.form.ingredients = this.form.ingredients.filter(i => i.ingredientId !== ingredientId)
    this.announcement.set(`${this.getIngredientName(ingredientId)} quitado`)
    // El botón enfocado desaparece: tras renderizar, el foco pasa al botón
    // «Quitar» siguiente (o al anterior) y, si no quedan, al selector.
    afterNextRender(() => this.focusAfterRemoval(index), { injector: this.injector })
  }

  private focusAfterRemoval(removedIndex: number): void {
    const buttons = this.removeButtons()
    const target = buttons[Math.min(removedIndex, buttons.length - 1)]
    ;(target?.nativeElement ?? this.ingredientSelect().nativeElement).focus()
  }

  private validateNewIngredient(): string | null {
    if (!this.newIngredientId) return 'Selecciona un ingrediente.'
    if (!(this.newIngredientQty > 0)) return 'La cantidad debe ser mayor que 0.'
    if (this.form.ingredients.some(i => i.ingredientId === this.newIngredientId)) {
      return 'Ese ingrediente ya está añadido.'
    }
    return null
  }

  getIngredientName(ingredientId: string): string {
    const ingredient = this.ingredientStore.ingredients().find(i => i.id === ingredientId)
    return ingredient ? `${ingredient.name} (${ingredient.unit})` : ingredientId
  }

  async onSubmit(): Promise<void> {
    this.error.set(null)
    this.loading.set(true)
    try {
      if (this.isEditing && this.dishId) {
        await this.store.update(this.restaurantId, this.dishId, this.form)
      } else {
        await this.store.create(this.restaurantId, this.form)
      }
      this.router.navigate(['/restaurants', this.restaurantId, 'dishes'])
    } catch (err: any) {
      this.error.set(err?.error?.message ?? 'Error al guardar el plato.')
    } finally {
      this.loading.set(false)
    }
  }
}
