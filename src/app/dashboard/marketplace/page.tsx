import Image from "next/image"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

const marketplaceItems = [
  {
    id: 1,
    name: "Pro Tennis Racket",
    price: 199.99,
    image: "https://placehold.co/300x200.png",
    hint: "tennis racket",
  },
  {
    id: 2,
    name: "Advanced Grip Tape",
    price: 14.99,
    image: "https://placehold.co/300x200.png",
    hint: "racket grip",
  },
  {
    id: 3,
    name: "Championship Tennis Balls (3-pack)",
    price: 9.99,
    image: "https://placehold.co/300x200.png",
    hint: "tennis balls",
  },
  {
    id: 4,
    name: "Breathable Tennis Polo",
    price: 49.99,
    image: "https://placehold.co/300x200.png",
    hint: "sports shirt",
  },
  {
    id: 5,
    name: "All-Court Tennis Shoes",
    price: 129.99,
    image: "https://placehold.co/300x200.png",
    hint: "tennis shoes",
  },
  {
    id: 6,
    name: "Private Coaching Session",
    price: 75.00,
    image: "https://placehold.co/300x200.png",
    hint: "tennis coach",
  },
];


export default function MarketplacePage() {
  return (
    <>
      <div className="flex items-center justify-between space-y-2">
        <div className="flex flex-col w-full">
            <h1 className="text-3xl font-bold tracking-tight">Marketplace</h1>
            <p className="text-muted-foreground">Browse gear and services from other players.</p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {marketplaceItems.map((item) => (
          <Card key={item.id} className="overflow-hidden">
            <CardHeader className="p-0">
                <Image
                    src={item.image}
                    width={300}
                    height={200}
                    alt={item.name}
                    data-ai-hint={item.hint}
                    className="w-full h-48 object-cover"
                />
            </CardHeader>
            <CardContent className="p-4">
              <CardTitle className="text-lg">{item.name}</CardTitle>
              <CardDescription className="text-primary font-bold text-xl mt-2">${item.price.toFixed(2)}</CardDescription>
            </CardContent>
            <CardFooter className="p-4 pt-0">
              <Button className="w-full">Add to Cart</Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </>
  )
}
