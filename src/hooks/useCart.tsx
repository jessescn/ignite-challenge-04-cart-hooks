import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface StockProduct {
  id: number;
  amount: number
}

interface ProductAmount extends UpdateProductAmount{}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {

  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const stockResponse = await api.get<StockProduct>(`stock/${productId}`);
      const productResponse = await api.get<Product>(`products/${productId}`)
            
      const { amount } = stockResponse.data;
      const product = productResponse.data;

      if(amount < 1){
        toast.error('Quantidade solicitada fora de estoque');
        return
      }
  
      let inCart = false;
      let outOfStock = false;

      let newCart = cart.map(prod => {

        if(prod.id === productId){
          inCart = true;

          if(prod.amount < amount){
            console.log(prod.amount);
            console.log(amount);
            
            
            prod.amount += 1

          } else {
            outOfStock = true;
          }
        }
        return prod;
      })

      
      if(!inCart){
        newCart.push({...product, amount: 1});
      }
      
      if(outOfStock){
        toast.error('Quantidade solicitada fora de estoque');
        return
      }
      
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
      setCart(newCart);
      
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const newCart = cart.filter(product => product.id !== productId)

      if(newCart.length === cart.length){
        toast.error('Erro na remoção do produto');
        return
      }

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
      setCart(newCart);

    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if(amount < 1){
        return
      }

      const response = await api.get<StockProduct>(`stock/${productId}`)
      const { amount: productAmount} = response.data;

      if(amount <= productAmount){
        const newCart = cart.map(product => {
          if(product.id === productId){
            product.amount = amount
          }
          return product;
        })
        
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
        setCart(newCart);
      } else {
        toast.error('Quantidade solicitada fora de estoque');
      }
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
