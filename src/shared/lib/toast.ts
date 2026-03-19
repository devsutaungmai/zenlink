import Swal from 'sweetalert2'

export const toast = (
  icon: 'success' | 'error' | 'warning' | 'info',
  text: string
) =>
  Swal.fire({
    text,
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    icon,
    customClass: {
      popup: 'swal-toast-wide',
    },
  })