import * as React from 'react';
import * as SliderPrimitive from '@radix-ui/react-slider';
import { cn } from '@/lib/utils';

const Slider = React.forwardRef<React.ElementRef<typeof SliderPrimitive.Root>, React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>>(
    ({ className, ...props }, ref) => (
        <SliderPrimitive.Root ref={ref} className={cn('relative flex h-5 w-full touch-none select-none items-center', className)} {...props}>
            <SliderPrimitive.Track className="relative h-1 w-full grow overflow-hidden rounded-full bg-border">
                <SliderPrimitive.Range className="absolute h-full bg-foreground" />
            </SliderPrimitive.Track>
            <SliderPrimitive.Thumb className="block h-4 w-4 rounded-full border-2 border-foreground bg-background shadow-[0_1px_3px_hsl(0_0%_0%/0.25)] transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-110" />
        </SliderPrimitive.Root>
    ),
);
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };
