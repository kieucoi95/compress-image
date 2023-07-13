import { Component } from '@angular/core';
import { NgxImageCompressService, UploadResponse } from 'ngx-image-compress';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
})
export class AppComponent {
    imageFiles: File[] = [];
    zipFile!: Blob;
    imgBe: string = '';
    imgAf: string = '';

    constructor(private imageCompress: NgxImageCompressService) {}

    handleFileInput(event: any): void {
        const file = event.target.files[0];
        this.zipFile = new Blob([file]);
    }

    compressImagesFromZip(zipFile: Blob): void {
        const zip = new JSZip();

        const reader = new FileReader();
        reader.onload = (event) => {
            const zipData = event.target?.result as ArrayBuffer;
            console.log(zipData);

            JSZip.loadAsync(zipData)
                .then((loadedZip) => {
                    const imagePromises: any = [];

                    loadedZip.forEach(async (relativePath, zipEntry) => {
                        if (!zipEntry.dir && this.isImageFile(zipEntry.name)) {
                            const imageBlob = await zipEntry.async('blob');
                            const imageFile = new File([imageBlob], zipEntry.name);
                            const promise = this.compressImage(imageFile);

                            imagePromises.push(promise);
                        }
                    });

                    Promise.allSettled(imagePromises)
                        .then((results) => {
                            // console.log(results);

                            const compressedImages = results.filter((result) => result.status === 'fulfilled').map((result: any) => result.value);

                            compressedImages.forEach((compressedImage, index) => {
                                const imageName = this.imageFiles[index].name;
                                zip.file(imageName, compressedImage, { binary: true });
                            });

                            zip.generateAsync({ type: 'blob' })
                                .then((zipContent) => {
                                    // this.downloadZip(zipContent, 'compressed_images.zip');
                                })
                                .catch((error) => {
                                    console.error('Error generating ZIP:', error);
                                });
                        })
                        .catch((error) => {
                            console.error('Error compressing images:', error);
                        });
                })
                .catch((error) => {
                    console.error('Error loading ZIP file:', error);
                });
        };

        reader.readAsArrayBuffer(zipFile);
    }

    isImageFile(fileName: string): boolean {
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif'];
        const extension = fileName.toLowerCase().substr(fileName.lastIndexOf('.'));
        return imageExtensions.includes(extension);
    }

    compressImage(imageFile: File): Promise<ArrayBuffer> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async () => {
                const base64Image = reader.result as string;
                console.log(base64Image);
                this.imgBe = base64Image;
                try {
                    const compressedImage = await this.imageCompress.compressFile(base64Image, -1, 100, 30);
                    console.log(compressedImage);
                    this.imgAf = compressedImage;
                    const arrayBuffer = this.base64ToArrayBuffer(compressedImage);
                    resolve(arrayBuffer);
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = (error) => {
                reject(error);
            };
            reader.readAsDataURL(imageFile);
        });
    }

    base64ToArrayBuffer(base64: string): ArrayBuffer {
        const binaryString = atob(base64.split(',')[1]);
        const length = binaryString.length;
        const bytes = new Uint8Array(length);
        for (let i = 0; i < length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes.buffer;
    }
}
