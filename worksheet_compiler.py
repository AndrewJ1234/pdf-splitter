import os
from fpdf import FPDF
from PIL import Image

class WorksheetPDF(FPDF):
    def header(self):
        self.set_font('Arial', 'B', 15)
        self.set_text_color(67, 79, 241) # Indigo
        self.cell(0, 10, 'Homework Worksheet', 0, 1, 'C')
        self.ln(5)

    def add_problem(self, title, img_path):
        self.add_page()
        
        # 1. Problem Title
        self.set_font('Arial', 'B', 14)
        self.set_text_color(67, 79, 241)
        self.cell(0, 10, title, 0, 1, 'L')
        self.ln(5)

        # 2. Problem Image
        # Calculate scaling to fit page while leaving room for notes
        img = Image.open(img_path)
        img_w, img_h = img.size
        
        # Page size in mm
        page_w = 210
        page_h = 297
        margin = 15
        usable_w = page_w - (margin * 2)
        
        # Target max height for image (45% of page)
        max_h = page_h * 0.45
        
        # Calculate aspect ratio
        ratio = img_h / img_w
        draw_w = usable_w
        draw_h = draw_w * ratio
        
        if draw_h > max_h:
            draw_h = max_h
            draw_w = draw_h / ratio
            
        self.image(img_path, x=margin, y=self.get_y(), w=draw_w)
        self.set_y(self.get_y() + draw_h + 15)

        # 3. Notes Area Label
        self.set_font('Arial', 'B', 10)
        self.set_text_color(74, 222, 128) # Greenish
        self.cell(0, 10, 'NOTES / SOLUTION AREA', 0, 1, 'L')
        
        # 4. Draw lines for notes
        self.set_draw_color(220, 220, 220)
        curr_y = self.get_y()
        while curr_y < page_h - margin:
            self.line(margin, curr_y, page_w - margin, curr_y)
            curr_y += 8

def compile_worksheet(image_dir, output_pdf):
    pdf = WorksheetPDF()
    
    # Get all images in order
    files = sorted([f for f in os.listdir(image_dir) if f.lower().endswith(('.png', '.jpg', '.jpeg'))])
    
    if not files:
        print("No images found in the directory!")
        return

    for filename in files:
        title = filename.replace('_', ' ').split('.')[0].title()
        path = os.path.join(image_dir, filename)
        print(f"Adding {title}...")
        pdf.add_problem(title, path)
        
    pdf.output(output_pdf)
    print(f"\nSuccess! Worksheet saved as {output_pdf}")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Compile problem images into a PDF worksheet.")
    parser.add_argument("dir", help="Directory containing problem images")
    parser.add_argument("--out", default="homework_worksheet.pdf", help="Output PDF filename")
    
    args = parser.parse_args()
    
    if os.path.isdir(args.dir):
        compile_worksheet(args.dir, args.out)
    else:
        print(f"Error: {args.dir} is not a valid directory.")
