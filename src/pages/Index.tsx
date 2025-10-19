import { ImageProcessor } from "@/components/ImageProcessor";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-6xl mx-auto py-8 px-4">
        <header className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Виявлення квадратів
          </h1>
          {/*<p className="text-muted-foreground text-lg">*/}
          {/*  Лисенок Д.В. КІ-221, підгрупа 2/6*/}
          {/*</p>*/}
        </header>

        <ImageProcessor />
      </div>
    </div>
  );
};

export default Index;
